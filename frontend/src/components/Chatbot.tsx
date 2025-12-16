import React, { Fragment, useState, useEffect, useRef } from 'react';
import { api } from '../services/api';
import { Transition } from '@headlessui/react';
import { MessageCircle, Send, X, Sparkles, RefreshCw, Minimize2, Maximize2, User } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import RobotIllustration from './website-ui/Illustrations/RobotIllustration';

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
  // Logic Section - UNTOUCHED (as requested)
  
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
      // API Logic remains identical
      const res = await api.post<{ reply: string }>('/chat/', { message: userMessage });

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

  // UI/UX Overhaul Section starts here
  return (
    <>
      {/* Refined Styles for Scrollbar & Animations */}
      <style dangerouslySetInnerHTML={{ __html: `
        .chatbot-scrollbar::-webkit-scrollbar {
          width: 5px;
        }
        .chatbot-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .chatbot-scrollbar::-webkit-scrollbar-thumb {
          background: #e2e8f0;
          border-radius: 10px;
        }
        .chatbot-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #cbd5e1;
        }
        
        @keyframes float {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-5px); }
          100% { transform: translateY(0px); }
        }
        
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }

        .typing-dot {
          animation: typing 1.4s infinite ease-in-out both;
        }
        .typing-dot:nth-child(1) { animation-delay: -0.32s; }
        .typing-dot:nth-child(2) { animation-delay: -0.16s; }
        
        @keyframes typing {
          0%, 80%, 100% { transform: scale(0); }
          40% { transform: scale(1); }
        }
      `}} />

      {/* Launcher Button */}
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
          aria-label="Open support chat"
          className="fixed bottom-6 right-6 z-50 group"
        >
          {/* Soft Glow */}
          <div className="absolute inset-0 rounded-full bg-blue-600/20 blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

          {/* Button */}
          <div
            className="
              relative h-14 w-14              /* smaller size */
              bg-white                         
              rounded-full
              flex items-center justify-center
              shadow-[0_4px_12px_rgba(0,0,0,0.12)]
              hover:shadow-[0_6px_16px_rgba(0,0,0,0.18)]
              transition-all duration-300
              hover:scale-[1.06] active:scale-95
              border    
            "
          >
            <MessageCircle className="h-6 w-6 text-blue-600" /> {/* royal blue icon */}
          </div>
        </button>

      </Transition>

      {/* Main Chat Window */}
      <Transition appear show={isOpen} as={Fragment}>
        <div className={`fixed z-50 transition-all duration-300 ease-in-out
          ${isMinimized 
            ? 'bottom-6 right-6 w-72' 
            : 'bottom-0 right-0 w-full h-full sm:bottom-6 sm:right-6 sm:w-[400px] sm:h-[600px] md:w-[450px]'
          }
        `}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0 scale-95 translate-y-8"
            enterTo="opacity-100 scale-100 translate-y-0"
            leave="ease-in duration-200"
            leaveFrom="opacity-100 scale-100 translate-y-0"
            leaveTo="opacity-0 scale-95 translate-y-8"
          >
            <div className={`flex flex-col h-full bg-white shadow-2xl overflow-hidden border border-gray-100/50 
              ${isMinimized ? 'rounded-2xl' : 'sm:rounded-2xl'}
            `}>
              
              {/* Header */}
              <div className="bg-slate-900 p-4 flex items-center justify-between shadow-md relative overflow-hidden">
                {/* Decorative Background Elements */}
                <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-blue-500/20 rounded-full blur-xl"></div>
                <div className="absolute bottom-0 left-0 -mb-4 -ml-4 w-20 h-20 bg-purple-500/20 rounded-full blur-xl"></div>

                <div className="flex items-center gap-3 relative z-10">
                  <div className="relative">
                    <div className="w-10 h-10 flex items-center justify-center">
                      <RobotIllustration className="w-full h-full" />
                    </div>
                    <span className="absolute -bottom-1 -right-1 flex h-3 w-3">
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500 border-2 border-slate-900"></span>
                    </span>
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-base tracking-wide">DataPulse AI</h3>
                    <p className="text-blue-200 text-xs font-medium">Online & Ready</p>
                  </div>
                </div>

                <div className="flex items-center gap-1 relative z-10">
                  <button
                    onClick={handleNewChat}
                    title="Reset Chat"
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setIsMinimized(!isMinimized)}
                    title={isMinimized ? "Maximize" : "Minimize"}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors hidden sm:block"
                  >
                    {isMinimized ? <Maximize2 className="h-4 w-4"/> : <Minimize2 className="h-4 w-4"/>}
                  </button>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Chat Content Area */}
              {!isMinimized && (
                <>
                  <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-slate-50 chatbot-scrollbar">
                    
                    {/* Welcome / Empty State */}
                    {messages.length === 1 && !isLoading && (
                      <div className="mt-4 mb-8">
                        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-4">
                          <h4 className="text-sm font-semibold text-gray-800 mb-2 flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-amber-500" />
                            Suggested Questions
                          </h4>
                          <div className="grid gap-2">
                            {conversationStarters.slice(0, 6).map((q, idx) => (
                              <button
                                key={idx}
                                onClick={() => handleSendMessage(q)}
                                className="text-left text-xs p-2.5 rounded-lg bg-gray-50 hover:bg-blue-50 text-gray-600 hover:text-blue-700 transition-colors border border-transparent hover:border-blue-100"
                              >
                                {q}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Message List */}
                    {messages.map((msg, index) => (
                      <div
                        key={index}
                        className={`flex gap-3 ${msg.sender === 'user' ? 'flex-row-reverse' : ''}`}
                      >
                        <div
                          className={`w-10 h-10 flex items-center justify-center flex-shrink-0
                            ${msg.sender === 'ai'
                              ? ''  // AI = no background
                              : 'rounded-full bg-slate-200 shadow-sm' // Human = keep bg
                            }`}
                        >
                          {msg.sender === 'ai' ? (
                            <RobotIllustration className="w-full h-full" />
                          ) : (
                            <User className="w-5 h-5 text-slate-600" />
                          )}
                        </div>

                        {/* Bubble */}
                        <div className={`flex flex-col max-w-[85%] ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
                          <div
                            className={`px-4 py-3 shadow-sm text-sm leading-relaxed
                              ${msg.sender === 'user'
                                ? 'bg-slate-900 text-white rounded-2xl rounded-tr-none'
                                : 'bg-white text-slate-800 border border-gray-100 rounded-2xl rounded-tl-none'
                              }
                            `}
                          >
                            <div className={`prose prose-sm max-w-none 
                              ${msg.sender === 'user' 
                                ? 'prose-invert prose-p:text-white prose-a:text-blue-300' 
                                : 'prose-slate prose-p:text-slate-700 prose-a:text-blue-600'
                              }
                            `}>
                              <ReactMarkdown>{msg.text}</ReactMarkdown>
                            </div>
                          </div>
                          
                          {msg.timestamp && (
                            <span className="text-[10px] text-gray-400 mt-1 px-1">
                              {formatTime(msg.timestamp)}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}

                    {/* Loading Indicator */}
                    {isLoading && (
                      <div className="flex gap-3">
                        <div className="w-10 h-10 flex items-center justify-center flex-shrink-0">
                          <RobotIllustration className="w-full h-full animate-pulse" />
                        </div>
                        <div className="bg-white border border-gray-100 px-4 py-3 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-1">
                          <div className="w-1.5 h-1.5 bg-gray-400 rounded-full typing-dot"></div>
                          <div className="w-1.5 h-1.5 bg-gray-400 rounded-full typing-dot"></div>
                          <div className="w-1.5 h-1.5 bg-gray-400 rounded-full typing-dot"></div>
                        </div>
                      </div>
                    )}
                    
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Input Area */}
                  <div className="p-4 bg-white border-t border-gray-100">
                    <form 
                      onSubmit={handleFormSubmit}
                      className="relative flex items-center gap-2"
                    >
                      <input
                        ref={inputRef}
                        type="text"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        placeholder="Ask DataPulse AI..."
                        disabled={isLoading}
                        className="w-full bg-gray-50 text-gray-900 text-sm rounded-xl pl-4 pr-12 py-3.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white border border-gray-200 focus:border-blue-500 transition-all placeholder:text-gray-400 disabled:opacity-60 disabled:cursor-not-allowed"
                      />
                      <button
                        type="submit"
                        disabled={isLoading || !inputValue.trim()}
                        className="absolute right-2 p-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed transition-all duration-200 shadow-sm"
                      >
                        <Send className="h-4 w-4" />
                      </button>
                    </form>
                    <div className="mt-2 text-center">
                       <p className="text-[10px] text-gray-400">
                        AI can make mistakes. Verify important info.
                      </p>
                    </div>
                  </div>
                </>
              )}

              {/* Minimized State Content */}
              {isMinimized && (
                <div 
                  className="p-4 bg-white cursor-pointer hover:bg-gray-50 transition-colors flex items-center justify-between group"
                  onClick={() => setIsMinimized(false)}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors">
                      <MessageCircle className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-800">Chat hidden</p>
                      <p className="text-xs text-gray-500">Click to expand</p>
                    </div>
                  </div>
                  <Maximize2 className="w-4 h-4 text-gray-400 group-hover:text-blue-500" />
                </div>
              )}
            </div>
          </Transition.Child>
        </div>
      </Transition>
    </>
  );
};