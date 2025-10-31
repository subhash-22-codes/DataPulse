import React, { Fragment, useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Transition } from '@headlessui/react';
import { MessageCircle, Send, X, Sparkles, RefreshCw, Minimize2, Maximize2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface Message {
  sender: 'user' | 'ai';
  text: string;
  timestamp?: Date;
}

const conversationStarters = [
  "What is DataPulse?",
  "Explain Smart Alerts",
  "How does API Polling work?",
  "Are there any usage limits?",
  "How do I create a workspace?",
  "What is the difference between a Manual Upload and an API Poll?",
  "How do I set up a Smart Alert?",
  "Explain the Snapshot vs. Trend views.",
];

const welcomeMessage: Message = {
  sender: 'ai',
  text: "Hello! I'm DataPulse AI. I can answer questions about how this application works. Ask me something, or try one of the suggestions below!",
  timestamp: new Date()
};

export const Chatbot: React.FC = () => {
  const { token } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([welcomeMessage]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<null | HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages, isLoading]);

  useEffect(() => {
    if (isOpen && !isMinimized) {
      inputRef.current?.focus();
    }
  }, [isOpen, isMinimized]);

  const handleSendMessage = async (messageText: string) => {
    const userMessage = messageText.trim();
    if (!userMessage || isLoading) return;

    const newUserMessage: Message = {
      sender: 'user',
      text: userMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, newUserMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const res = await api.post<{ reply: string }>('/chat/', { message: userMessage }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const aiMessage: Message = {
        sender: 'ai',
        text: res.data.reply,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.log(error);
      const errorMessage: Message = {
        sender: 'ai',
        text: "Sorry, I'm having trouble connecting right now. Please try again later.",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSendMessage(inputValue);
  };

  const handleNewChat = () => {
    setMessages([welcomeMessage]);
    setInputValue('');
  };

  const formatTime = (date?: Date) => {
    if (!date) return '';
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        .chatbot-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .chatbot-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .chatbot-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 3px;
        }
        .chatbot-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
        .chatbot-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: #cbd5e1 transparent;
        }

        @keyframes slideInUp {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        .chat-message-enter {
          animation: slideInUp 0.3s ease-out;
        }

        .pulse-ring {
          animation: pulse-ring 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }

        @keyframes pulse-ring {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }

        .gradient-shimmer {
          background: linear-gradient(90deg, #3b82f6 0%, #8b5cf6 50%, #3b82f6 100%);
          background-size: 200% 100%;
          animation: shimmer 3s ease-in-out infinite;
        }

        @keyframes shimmer {
          0% {
            background-position: 200% 0;
          }
          100% {
            background-position: -200% 0;
          }
        }
      `}} />

      <Transition
        show={!isOpen}
        as={Fragment}
        enter="transform ease-out duration-300 transition"
        enterFrom="translate-y-2 opacity-0 scale-75"
        enterTo="translate-y-0 opacity-100 scale-100"
        leave="transition ease-in duration-150"
        leaveFrom="opacity-100 scale-100"
        leaveTo="opacity-0 scale-75"
      >
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 bg-gradient-to-br from-blue-600 to-blue-700 text-white p-4 rounded-full shadow-2xl hover:shadow-blue-500/50 hover:scale-110 focus:outline-none transition-all duration-300 z-50 group"
          aria-label="Open chat"
        >
          <div className="absolute inset-0 rounded-full bg-blue-400 opacity-0 group-hover:opacity-20 pulse-ring"></div>
          <MessageCircle className="h-6 w-6 relative z-10" />
        </button>
      </Transition>

      <Transition appear show={isOpen} as={Fragment}>
        <div className={`fixed ${isMinimized ? 'bottom-6 right-6' : 'bottom-0 right-0 sm:bottom-6 sm:right-6'} ${isMinimized ? 'w-80' : 'w-full h-full sm:w-[420px] sm:h-[600px] md:w-[480px] md:h-[650px]'} z-50 transition-all duration-300`}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0 scale-95 translate-y-4"
            enterTo="opacity-100 scale-100 translate-y-0"
            leave="ease-in duration-200"
            leaveFrom="opacity-100 scale-100 translate-y-0"
            leaveTo="opacity-0 scale-95 translate-y-4"
          >
            <div className={`flex flex-col h-full bg-white ${isMinimized ? 'rounded-2xl' : 'sm:rounded-2xl'} shadow-2xl overflow-hidden border border-gray-200`}>
              <div className="gradient-shimmer p-5 border-b border-white/20 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                      <Sparkles className="h-5 w-5 text-white" />
                    </div>
                    <span className="absolute bottom-0 right-0 flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500 border-2 border-white"></span>
                    </span>
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-lg">DataPulse AI</h3>
                    <p className="text-white/80 text-xs">Always here to help</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={handleNewChat}
                    title="New Chat"
                    className="p-2 rounded-lg text-white/80 hover:bg-white/20 hover:text-white transition-all duration-200"
                    aria-label="Start new chat"
                  >
                    <RefreshCw className="h-4 w-4"/>
                  </button>
                  <button
                    onClick={() => setIsMinimized(!isMinimized)}
                    title={isMinimized ? "Maximize" : "Minimize"}
                    className="p-2 rounded-lg text-white/80 hover:bg-white/20 hover:text-white transition-all duration-200 hidden sm:block"
                    aria-label={isMinimized ? "Maximize chat" : "Minimize chat"}
                  >
                    {isMinimized ? <Maximize2 className="h-4 w-4"/> : <Minimize2 className="h-4 w-4"/>}
                  </button>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-2 rounded-lg text-white/80 hover:bg-white/20 hover:text-white transition-all duration-200"
                    aria-label="Close chat"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {!isMinimized && (
                <>
                  <div className="flex-1 p-4 md:p-6 overflow-y-auto space-y-4 bg-gradient-to-b from-gray-50 to-white chatbot-scrollbar">
                    {messages.map((msg, index) => (
                      <div
                        key={index}
                        className={`flex items-end gap-2 chat-message-enter ${msg.sender === 'user' ? 'justify-end' : ''}`}
                      >
                        {msg.sender === 'ai' && (
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0 shadow-lg">
                            <Sparkles className="w-4 h-4 text-white"/>
                          </div>
                        )}
                        <div className="flex flex-col max-w-[85%] md:max-w-[80%]">
                          <div
                            className={`prose prose-sm p-4 rounded-2xl shadow-sm ${
                              msg.sender === 'user'
                                ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-br-sm prose-invert prose-headings:text-white prose-p:text-white prose-strong:text-white prose-code:text-blue-100 prose-code:bg-blue-800/30'
                                : 'bg-white text-gray-800 rounded-bl-sm border border-gray-100 prose-headings:text-gray-900 prose-p:text-gray-700 prose-strong:text-gray-900 prose-code:text-purple-600 prose-code:bg-purple-50'
                            }`}
                          >
                            <ReactMarkdown>{msg.text}</ReactMarkdown>
                          </div>
                          {msg.timestamp && (
                            <span className={`text-[10px] text-gray-400 mt-1 px-2 ${msg.sender === 'user' ? 'text-right' : 'text-left'}`}>
                              {formatTime(msg.timestamp)}
                            </span>
                          )}
                        </div>
                        {msg.sender === 'user' && (
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-600 to-gray-700 flex items-center justify-center flex-shrink-0 text-white text-sm font-semibold shadow-lg">
                            U
                          </div>
                        )}
                      </div>
                    ))}

                    {isLoading && (
                      <div className="flex items-end gap-2 chat-message-enter">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0 shadow-lg">
                          <Sparkles className="w-4 h-4 text-white animate-pulse"/>
                        </div>
                        <div className="p-4 rounded-2xl bg-white rounded-bl-sm flex items-center gap-2 shadow-sm border border-gray-100">
                          <div className="flex gap-1.5">
                            <span className="h-2 w-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full animate-bounce"></span>
                            <span className="h-2 w-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></span>
                            <span className="h-2 w-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                          </div>
                          <span className="text-xs text-gray-500 ml-1">Thinking...</span>
                        </div>
                      </div>
                    )}

                    {messages.length === 1 && !isLoading && (
                      <div className="pt-2 space-y-2 animate-fade-in">
                        <p className="text-xs text-gray-500 font-medium px-2 mb-3">Try asking:</p>
                        {conversationStarters.map((q, idx) => (
                          <button
                            key={q}
                            onClick={() => handleSendMessage(q)}
                            className="w-full text-left p-3.5 bg-white border-2 border-gray-200 rounded-xl text-sm text-blue-700 font-medium hover:border-blue-300 hover:bg-blue-50 hover:shadow-md transition-all duration-200 group"
                            style={{ animationDelay: `${idx * 0.1}s` }}
                          >
                            <span className="flex items-center justify-between">
                              <span>{q}</span>
                              <Send className="h-3.5 w-3.5 text-gray-400 group-hover:text-blue-600 transition-colors"/>
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  <form onSubmit={handleFormSubmit} className="p-4 md:p-5 border-t bg-white">
                    <div className="relative group">
                      <input
                        ref={inputRef}
                        type="text"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        placeholder="Ask about DataPulse..."
                        disabled={isLoading}
                        className="w-full pl-4 pr-12 py-3.5 border-2 border-gray-200 rounded-xl disabled:bg-gray-50 disabled:cursor-not-allowed transition-all duration-200 text-sm placeholder:text-gray-400 hover:border-gray-300"
                        aria-label="Chat input"
                      />
                      <button
                        type="submit"
                        disabled={isLoading || !inputValue.trim()}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-2.5 rounded-lg bg-gradient-to-br from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-blue-500/50 disabled:shadow-none"
                        aria-label="Send message"
                      >
                        <Send className="h-4 w-4" />
                      </button>
                    </div>
                    <p className="text-[10px] text-gray-400 text-center mt-2">
                      AI responses may vary. Always verify important information.
                    </p>
                  </form>
                </>
              )}

              {isMinimized && (
                <div className="p-4 flex items-center justify-center text-gray-500 text-sm">
                  Click to expand chat
                </div>
              )}
            </div>
          </Transition.Child>
        </div>
      </Transition>
    </>
  );
};
