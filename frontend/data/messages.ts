/**
 * Board Messages Data
 * Store and manage message board posts in Supabase.
 * Messages older than 7 days are automatically deleted from the database.
 */

import { supabase } from '../lib/supabase';
import { getBoardMessagesStorageWindow } from '../utils/date';
import { BoardMessage } from './types';

// In-memory cache of board messages
let boardMessages: BoardMessage[] = [];
let isLoaded = false;

/**
 * Map DB row to BoardMessage (snake_case -> camelCase)
 */
function rowToBoardMessage(row: any): BoardMessage {
  return {
    id: row.id,
    header: row.header,
    author: row.author,
    content: row.content,
    createdAt: new Date(row.created_at),
  };
}

/**
 * Load board messages from Supabase within the 7-day window
 */
async function loadBoardMessages(): Promise<BoardMessage[]> {
  try {
    const { startDate } = getBoardMessagesStorageWindow();
    const startStr = startDate.toISOString();
    const { data: rows, error } = await supabase
      .from('board_messages')
      .select('*')
      .gte('created_at', startStr)
      .order('created_at', { ascending: false });
    if (error) {
      console.error('Error loading board messages:', error);
      return [];
    }
    if (!rows || rows.length === 0) return [];
    return rows.map(rowToBoardMessage);
  } catch (error) {
    console.error('Error loading board messages:', error);
    return [];
  }
}

/**
 * Clean up board messages older than 7 days (delete from DB).
 */
async function cleanupOldBoardMessages(): Promise<void> {
  const { startDate } = getBoardMessagesStorageWindow();
  const startStr = startDate.toISOString();
  const { error } = await supabase
    .from('board_messages')
    .delete()
    .lt('created_at', startStr);
  if (error) {
    console.error('Error cleaning up old board messages:', error);
  }
}

/**
 * Initialize board messages (load from Supabase, cleanup, then reload)
 */
export async function initializeBoardMessages(): Promise<void> {
  if (isLoaded) return;
  boardMessages = await loadBoardMessages();
  await cleanupOldBoardMessages();
  boardMessages = await loadBoardMessages();
  isLoaded = true;
}

/**
 * Refetch board messages from Supabase and update cache.
 * Also runs cleanup so messages older than 7 days are deleted.
 */
export async function refetchBoardMessages(): Promise<void> {
  await cleanupOldBoardMessages();
  boardMessages = await loadBoardMessages();
}

/**
 * Get all board messages (newest first)
 */
export function getAllBoardMessages(): BoardMessage[] {
  const { startDate } = getBoardMessagesStorageWindow();
  return boardMessages.filter(message => {
    const messageDate = new Date(message.createdAt);
    return messageDate >= startDate;
  });
}

/**
 * Get board message by ID
 */
export function getBoardMessageById(id: string): BoardMessage | undefined {
  return boardMessages.find(message => message.id === id);
}

/**
 * Add a new board message
 */
export async function addBoardMessage(
  message: Omit<BoardMessage, 'id' | 'createdAt'>
): Promise<BoardMessage> {
  await initializeBoardMessages();

  const id = `message_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const now = new Date();
  const row = {
    id,
    header: message.header,
    author: message.author,
    content: message.content,
    created_at: now.toISOString(),
  };
  
  const { error } = await supabase.from('board_messages').insert(row);
  if (error) {
    console.error('Error inserting board message:', error);
    throw new Error(error.message);
  }

  await cleanupOldBoardMessages();
  boardMessages = await loadBoardMessages();
  const created = getBoardMessageById(id);
  return created ?? { ...message, id, createdAt: now };
}

/**
 * Delete a board message
 */
export async function deleteBoardMessage(id: string): Promise<boolean> {
  await initializeBoardMessages();
  const { error } = await supabase.from('board_messages').delete().eq('id', id);
  if (error) {
    console.error('Error deleting board message:', error);
    return false;
  }
  boardMessages = boardMessages.filter(m => m.id !== id);
  return true;
}

/**
 * Clear all board messages
 */
export async function clearAllBoardMessages(): Promise<void> {
  await initializeBoardMessages();
  const { error } = await supabase.from('board_messages').delete().neq('id', '');
  if (error) {
    console.error('Error clearing board messages:', error);
    throw error;
  }
  boardMessages = [];
  console.log('All board messages cleared');
}
