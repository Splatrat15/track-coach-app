/**
 * Board Messages Data
 * Store and manage message board posts with AsyncStorage persistence
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { BoardMessage } from './types';

const STORAGE_KEY = '@board_messages';

// In-memory cache of board messages
let boardMessages: BoardMessage[] = [];
let isLoaded = false;

/**
 * Load board messages from AsyncStorage
 */
async function loadBoardMessages(): Promise<BoardMessage[]> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEY);
    if (data) {
      const loaded = JSON.parse(data);
      return loaded.map((message: any) => ({
        ...message,
        createdAt: new Date(message.createdAt),
      }));
    }
  } catch (error) {
    console.error('Error loading board messages:', error);
  }
  return [];
}

/**
 * Save board messages to AsyncStorage
 */
async function saveBoardMessages(): Promise<void> {
  try {
    const dataToSave = JSON.stringify(boardMessages);
    await AsyncStorage.setItem(STORAGE_KEY, dataToSave);
  } catch (error) {
    console.error('Error saving board messages:', error);
  }
}

/**
 * Initialize board messages (load from storage)
 */
export async function initializeBoardMessages(): Promise<void> {
  if (!isLoaded) {
    boardMessages = await loadBoardMessages();
    // Sort by creation date, newest first
    boardMessages.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    isLoaded = true;
  }
}

/**
 * Get all board messages (newest first)
 */
export function getAllBoardMessages(): BoardMessage[] {
  return [...boardMessages];
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
  const newMessage: BoardMessage = {
    ...message,
    id: `message_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    createdAt: new Date(),
  };
  
  boardMessages.unshift(newMessage); // Add to beginning (newest first)
  // Keep only last 100 messages to prevent storage bloat
  if (boardMessages.length > 100) {
    boardMessages = boardMessages.slice(0, 100);
  }
  
  await saveBoardMessages();
  return newMessage;
}

/**
 * Delete a board message
 */
export async function deleteBoardMessage(id: string): Promise<boolean> {
  const index = boardMessages.findIndex(message => message.id === id);
  if (index === -1) return false;
  
  boardMessages.splice(index, 1);
  await saveBoardMessages();
  return true;
}

/**
 * Clear all board messages
 */
export async function clearAllBoardMessages(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
    boardMessages = [];
    isLoaded = false;
    console.log('All board messages cleared');
  } catch (error) {
    console.error('Error clearing board messages:', error);
    throw error;
  }
}

