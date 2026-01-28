import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TextInput, 
  TouchableOpacity, 
  KeyboardAvoidingView, 
  Platform,
  Linking,
  Alert,
  useWindowDimensions 
} from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import type { ThemeColors } from '../../constants/themes';
import { addBoardMessage, getAllBoardMessages, initializeBoardMessages } from '../../data/messages';
import { BoardMessage } from '../../data/types';
import { filterProfanity } from '../../utils/profanity';
import { formatTextWithLinks, TextSegment } from '../../utils/links';

export default function MessagesScreen() {
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const { colors } = useTheme();
  const [messages, setMessages] = useState<BoardMessage[]>([]);
  const [header, setHeader] = useState('');
  const [author, setAuthor] = useState('');
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize data on mount
  useEffect(() => {
    const init = async () => {
      await initializeBoardMessages();
      setMessages(getAllBoardMessages());
    };
    init();
  }, []);

  // Refresh messages when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      const refresh = async () => {
        await initializeBoardMessages();
        setMessages([...getAllBoardMessages()]);
      };
      refresh();
    }, [])
  );

  const handleSubmit = async () => {
    if (!header.trim() || !author.trim() || !content.trim()) {
      Alert.alert('Missing Fields', 'Please fill in all fields (header, author, and content)');
      return;
    }

    setIsSubmitting(true);
    try {
      // Filter profanity from all fields
      const filteredHeader = filterProfanity(header.trim());
      const filteredAuthor = filterProfanity(author.trim());
      const filteredContent = filterProfanity(content.trim());

      await addBoardMessage({
        header: filteredHeader,
        author: filteredAuthor,
        content: filteredContent,
      });

      // Clear form
      setHeader('');
      setAuthor('');
      setContent('');

      // Refresh messages
      await initializeBoardMessages();
      setMessages([...getAllBoardMessages()]);
    } catch (error) {
      console.error('Error adding message:', error);
      Alert.alert('Error', 'Failed to post message. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLinkPress = async (url: string) => {
    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) {
      await Linking.openURL(url);
    } else {
      Alert.alert('Error', 'Cannot open this link');
    }
  };

  const formatDate = (date: Date): string => {
    const now = new Date();
    const messageDate = new Date(date);
    const diffMs = now.getTime() - messageDate.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return messageDate.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: messageDate.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  };

  const renderMessageContent = (text: string) => {
    const segments = formatTextWithLinks(text);
    const s = getStyles(colors);
    return (
      <Text style={s.messageContentText}>
        {segments.map((segment: TextSegment, index: number) => {
          if (segment.type === 'link' && segment.url) {
            return (
              <Text
                key={index}
                style={s.linkText}
                onPress={() => handleLinkPress(segment.url!)}
              >
                {segment.content}
              </Text>
            );
          }
          return <Text key={index}>{segment.content}</Text>;
        })}
      </Text>
    );
  };

  const s = getStyles(colors);
  return (
    <KeyboardAvoidingView
      style={[styles.containerBase, s.container]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={[
          styles.contentContainer,
          isTablet && styles.contentContainerTablet
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.header, isTablet && styles.headerTablet]}>
          <Text style={[s.title, isTablet && styles.titleTablet]}>
            Message Board
          </Text>
          <Text style={[s.subtitle, isTablet && styles.subtitleTablet]}>
            Share messages with the team
          </Text>
        </View>

        {/* Post Form */}
        <View style={[s.formCard, isTablet && styles.formCardTablet]}>
          <Text style={[s.formTitle, isTablet && styles.formTitleTablet]}>
            Post a Message
          </Text>
          
          <TextInput
            style={[s.input, isTablet && styles.inputTablet]}
            placeholder="Header/Title"
            placeholderTextColor={colors.textMuted}
            value={header}
            onChangeText={setHeader}
            maxLength={100}
          />
          
          <TextInput
            style={[s.input, isTablet && styles.inputTablet]}
            placeholder="Your Name"
            placeholderTextColor={colors.textMuted}
            value={author}
            onChangeText={setAuthor}
            maxLength={50}
          />
          
          <TextInput
            style={[s.textArea, isTablet && styles.textAreaTablet]}
            placeholder="Message content... (links will be clickable)"
            placeholderTextColor={colors.textMuted}
            value={content}
            onChangeText={setContent}
            multiline
            numberOfLines={4}
            maxLength={1000}
            textAlignVertical="top"
          />
          
          <TouchableOpacity
            style={[
              s.submitButton,
              isSubmitting && styles.submitButtonDisabled,
              isTablet && styles.submitButtonTablet
            ]}
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            <Ionicons name="send" size={isTablet ? 24 : 20} color={colors.white} />
            <Text style={[s.submitButtonText, isTablet && styles.submitButtonTextTablet]}>
              {isSubmitting ? 'Posting...' : 'Post Message'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Messages List */}
        <View style={styles.messagesSection}>
          <Text style={[s.sectionTitle, isTablet && styles.sectionTitleTablet]}>
            Messages ({messages.length})
          </Text>
          
          {messages.length === 0 ? (
            <View style={[s.emptyCard, isTablet && styles.emptyCardTablet]}>
              <Ionicons name="chatbubbles-outline" size={isTablet ? 64 : 48} color={colors.textMuted} />
              <Text style={[s.emptyText, isTablet && styles.emptyTextTablet]}>
                No messages yet. Be the first to post!
              </Text>
            </View>
          ) : (
            messages.map((message) => (
              <View key={message.id} style={[s.messageCard, isTablet && styles.messageCardTablet]}>
                <View style={[s.messageHeader]}>
                  <View style={styles.messageHeaderLeft}>
                    <Text style={[s.messageHeaderText, isTablet && styles.messageHeaderTextTablet]}>
                      {message.header}
                    </Text>
                    <Text style={[s.messageAuthor, isTablet && styles.messageAuthorTablet]}>
                      by {message.author}
                    </Text>
                  </View>
                  <Text style={[s.messageTime, isTablet && styles.messageTimeTablet]}>
                    {formatDate(message.createdAt)}
                  </Text>
                </View>
                
                <View style={styles.messageContent}>
                  {renderMessageContent(message.content)}
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function getStyles(colors: ThemeColors) {
  return {
    container: {
      flex: 1,
      backgroundColor: colors.neutralBackground,
    },
    title: {
      fontSize: 32,
      marginBottom: 8,
      fontWeight: 'bold' as const,
      color: colors.text,
    },
    subtitle: {
      fontSize: 16,
      opacity: 0.7,
      color: colors.text,
    },
    formCard: {
      backgroundColor: colors.neutralLight,
      borderRadius: 12,
      padding: 20,
      marginBottom: 24,
      shadowColor: colors.black,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    formTitle: {
      fontSize: 20,
      marginBottom: 16,
      fontWeight: 'bold' as const,
      color: colors.text,
    },
    input: {
      backgroundColor: colors.neutralBackground,
      borderRadius: 8,
      padding: 12,
      fontSize: 16,
      color: colors.text,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: colors.neutralMedium,
    },
    textArea: {
      backgroundColor: colors.neutralBackground,
      borderRadius: 8,
      padding: 12,
      fontSize: 16,
      color: colors.text,
      marginBottom: 16,
      minHeight: 100,
      borderWidth: 1,
      borderColor: colors.neutralMedium,
    },
    submitButton: {
      backgroundColor: colors.primary,
      borderRadius: 8,
      padding: 14,
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      gap: 8,
    },
    submitButtonText: {
      color: colors.white,
      fontSize: 16,
      fontWeight: '600' as const,
    },
    sectionTitle: {
      fontSize: 24,
      marginBottom: 16,
      fontWeight: 'bold' as const,
      color: colors.text,
    },
    emptyCard: {
      backgroundColor: colors.neutralLight,
      borderRadius: 12,
      padding: 40,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      shadowColor: colors.black,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    emptyText: {
      fontSize: 16,
      color: colors.textMuted,
      marginTop: 16,
      textAlign: 'center' as const,
    },
    messageCard: {
      backgroundColor: colors.neutralLight,
      borderRadius: 12,
      padding: 20,
      marginBottom: 16,
      shadowColor: colors.black,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    messageHeader: {
      flexDirection: 'row' as const,
      justifyContent: 'space-between' as const,
      alignItems: 'flex-start' as const,
      marginBottom: 12,
      paddingBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.neutralMedium,
    },
    messageHeaderText: {
      fontSize: 18,
      marginBottom: 4,
      fontWeight: 'bold' as const,
      color: colors.text,
    },
    messageAuthor: {
      fontSize: 14,
      color: colors.textLight,
    },
    messageTime: {
      fontSize: 12,
      color: colors.textMuted,
    },
    messageContentText: {
      fontSize: 16,
      lineHeight: 24,
      color: colors.text,
    },
    linkText: {
      fontSize: 16,
      lineHeight: 24,
      color: colors.primary,
      textDecorationLine: 'underline' as const,
    },
  };
}

const styles = StyleSheet.create({
  containerBase: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 20,
  },
  contentContainerTablet: {
    maxWidth: 1200,
    alignSelf: 'center',
    width: '100%',
    paddingHorizontal: 40,
  },
  header: {
    marginBottom: 24,
  },
  headerTablet: {
    marginBottom: 32,
  },
  titleTablet: {
    fontSize: 48,
  },
  subtitleTablet: {
    fontSize: 20,
  },
  formCardTablet: {
    padding: 32,
    borderRadius: 16,
    marginBottom: 32,
  },
  formTitleTablet: {
    fontSize: 28,
    marginBottom: 24,
  },
  inputTablet: {
    padding: 16,
    fontSize: 18,
    marginBottom: 16,
    borderRadius: 12,
  },
  textAreaTablet: {
    padding: 16,
    fontSize: 18,
    minHeight: 120,
    marginBottom: 24,
    borderRadius: 12,
  },
  submitButtonTablet: {
    padding: 18,
    borderRadius: 12,
    gap: 12,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonTextTablet: {
    fontSize: 20,
  },
  messagesSection: {
    marginTop: 8,
  },
  sectionTitleTablet: {
    fontSize: 32,
    marginBottom: 24,
  },
  emptyCardTablet: {
    padding: 60,
    borderRadius: 16,
  },
  emptyTextTablet: {
    fontSize: 20,
    marginTop: 24,
  },
  messageCardTablet: {
    padding: 32,
    borderRadius: 16,
    marginBottom: 24,
  },
  messageHeaderLeft: {
    flex: 1,
    marginRight: 12,
  },
  messageHeaderTextTablet: {
    fontSize: 24,
    marginBottom: 6,
  },
  messageAuthorTablet: {
    fontSize: 18,
  },
  messageTimeTablet: {
    fontSize: 16,
  },
  messageContent: {
    marginTop: 8,
  },
});

