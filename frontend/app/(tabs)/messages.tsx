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
import { Colors, baseStyles } from '../../constants/styles';
import { addBoardMessage, getAllBoardMessages, initializeBoardMessages } from '../../data/messages';
import { BoardMessage } from '../../data/types';
import { filterProfanity } from '../../utils/profanity';
import { formatTextWithLinks, TextSegment } from '../../utils/links';

export default function MessagesScreen() {
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
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
    return (
      <Text style={styles.messageContentText}>
        {segments.map((segment: TextSegment, index: number) => {
          if (segment.type === 'link' && segment.url) {
            return (
              <Text
                key={index}
                style={styles.linkText}
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

  return (
    <KeyboardAvoidingView
      style={[baseStyles.container, styles.container]}
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
          <Text style={[baseStyles.heading, styles.title, isTablet && styles.titleTablet]}>
            Message Board
          </Text>
          <Text style={[baseStyles.text, styles.subtitle, isTablet && styles.subtitleTablet]}>
            Share messages with the team
          </Text>
        </View>

        {/* Post Form */}
        <View style={[styles.formCard, isTablet && styles.formCardTablet]}>
          <Text style={[baseStyles.heading, styles.formTitle, isTablet && styles.formTitleTablet]}>
            Post a Message
          </Text>
          
          <TextInput
            style={[styles.input, isTablet && styles.inputTablet]}
            placeholder="Header/Title"
            placeholderTextColor={Colors.textMuted}
            value={header}
            onChangeText={setHeader}
            maxLength={100}
          />
          
          <TextInput
            style={[styles.input, isTablet && styles.inputTablet]}
            placeholder="Your Name"
            placeholderTextColor={Colors.textMuted}
            value={author}
            onChangeText={setAuthor}
            maxLength={50}
          />
          
          <TextInput
            style={[styles.textArea, isTablet && styles.textAreaTablet]}
            placeholder="Message content... (links will be clickable)"
            placeholderTextColor={Colors.textMuted}
            value={content}
            onChangeText={setContent}
            multiline
            numberOfLines={4}
            maxLength={1000}
            textAlignVertical="top"
          />
          
          <TouchableOpacity
            style={[
              styles.submitButton,
              isSubmitting && styles.submitButtonDisabled,
              isTablet && styles.submitButtonTablet
            ]}
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            <Ionicons name="send" size={isTablet ? 24 : 20} color={Colors.white} />
            <Text style={[styles.submitButtonText, isTablet && styles.submitButtonTextTablet]}>
              {isSubmitting ? 'Posting...' : 'Post Message'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Messages List */}
        <View style={styles.messagesSection}>
          <Text style={[baseStyles.heading, styles.sectionTitle, isTablet && styles.sectionTitleTablet]}>
            Messages ({messages.length})
          </Text>
          
          {messages.length === 0 ? (
            <View style={[styles.emptyCard, isTablet && styles.emptyCardTablet]}>
              <Ionicons name="chatbubbles-outline" size={isTablet ? 64 : 48} color={Colors.textMuted} />
              <Text style={[baseStyles.text, styles.emptyText, isTablet && styles.emptyTextTablet]}>
                No messages yet. Be the first to post!
              </Text>
            </View>
          ) : (
            messages.map((message) => (
              <View key={message.id} style={[styles.messageCard, isTablet && styles.messageCardTablet]}>
                <View style={styles.messageHeader}>
                  <View style={styles.messageHeaderLeft}>
                    <Text style={[baseStyles.heading, styles.messageHeaderText, isTablet && styles.messageHeaderTextTablet]}>
                      {message.header}
                    </Text>
                    <Text style={[baseStyles.text, styles.messageAuthor, isTablet && styles.messageAuthorTablet]}>
                      by {message.author}
                    </Text>
                  </View>
                  <Text style={[baseStyles.text, styles.messageTime, isTablet && styles.messageTimeTablet]}>
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

const styles = StyleSheet.create({
  container: {
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
  title: {
    fontSize: 32,
    marginBottom: 8,
  },
  titleTablet: {
    fontSize: 48,
  },
  subtitle: {
    fontSize: 16,
    opacity: 0.7,
  },
  subtitleTablet: {
    fontSize: 20,
  },
  formCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  formCardTablet: {
    padding: 32,
    borderRadius: 16,
    marginBottom: 32,
  },
  formTitle: {
    fontSize: 20,
    marginBottom: 16,
  },
  formTitleTablet: {
    fontSize: 28,
    marginBottom: 24,
  },
  input: {
    backgroundColor: Colors.neutralLight,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: Colors.text,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.neutralMedium,
  },
  inputTablet: {
    padding: 16,
    fontSize: 18,
    marginBottom: 16,
    borderRadius: 12,
  },
  textArea: {
    backgroundColor: Colors.neutralLight,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: Colors.text,
    marginBottom: 16,
    minHeight: 100,
    borderWidth: 1,
    borderColor: Colors.neutralMedium,
  },
  textAreaTablet: {
    padding: 16,
    fontSize: 18,
    minHeight: 120,
    marginBottom: 24,
    borderRadius: 12,
  },
  submitButton: {
    backgroundColor: Colors.primary,
    borderRadius: 8,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  submitButtonTablet: {
    padding: 18,
    borderRadius: 12,
    gap: 12,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  submitButtonTextTablet: {
    fontSize: 20,
  },
  messagesSection: {
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 24,
    marginBottom: 16,
  },
  sectionTitleTablet: {
    fontSize: 32,
    marginBottom: 24,
  },
  emptyCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  emptyCardTablet: {
    padding: 60,
    borderRadius: 16,
  },
  emptyText: {
    fontSize: 16,
    color: Colors.textMuted,
    marginTop: 16,
    textAlign: 'center',
  },
  emptyTextTablet: {
    fontSize: 20,
    marginTop: 24,
  },
  messageCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  messageCardTablet: {
    padding: 32,
    borderRadius: 16,
    marginBottom: 24,
  },
  messageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutralMedium,
  },
  messageHeaderLeft: {
    flex: 1,
    marginRight: 12,
  },
  messageHeaderText: {
    fontSize: 18,
    marginBottom: 4,
  },
  messageHeaderTextTablet: {
    fontSize: 24,
    marginBottom: 6,
  },
  messageAuthor: {
    fontSize: 14,
    color: Colors.textLight,
  },
  messageAuthorTablet: {
    fontSize: 18,
  },
  messageTime: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  messageTimeTablet: {
    fontSize: 16,
  },
  messageContent: {
    marginTop: 8,
  },
  messageContentText: {
    fontSize: 16,
    lineHeight: 24,
    color: Colors.text,
  },
  linkText: {
    fontSize: 16,
    lineHeight: 24,
    color: Colors.primary,
    textDecorationLine: 'underline',
  },
});

