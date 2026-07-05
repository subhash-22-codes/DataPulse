import React, { Fragment, useState, useEffect, useRef } from 'react';
import { api } from '../services/api';
import { Transition } from '@headlessui/react';
import { MessageCircle, Send, X, Sparkles, RefreshCw, Minimize2, Maximize2, User } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import RobotIllustration from './website-ui/Illustrations/RobotIllustration';
import axios from 'axios';

interface Message {
  sender: 'user' | 'ai';
  text: string;
  timestamp?: Date;
}

const conversationStarters = [
  "What is DataPulse?",
  "What are the current usage limits?",
  "How do alerts work in general?",
  "How can I manage email notifications?",
  "Can I link my Google or GitHub account?",
  "How does data versioning work?",
  "What can Pulse help me with right now?",
];

const welcomeMessage: Message = {
  sender: 'ai',
  text: "Hi, I’m Pulse. I’m an early preview assistant for DataPulse. I can help with general questions, but I don’t cover every feature yet.",
  timestamp: new Date()
};

export const Chatbot: React.FC = () => {
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
      const recentContext = [...messages, newUserMessage]
        .slice(-6)
        .map(m => ({
          role: m.sender === "user" ? "user" : "assistant",
          text: m.text
        }));

      const res = await api.post<{ reply: string; preview?: boolean }>('/chat', {
        message: userMessage,
        history: recentContext
      });

      const aiMessage: Message = {
        sender: 'ai',
        text: res.data.reply,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error: unknown) {
      let backendError = "Sorry, I'm having trouble connecting right now. Please try again later.";

      if (axios.isAxiosError(error)) {
        backendError = error.response?.data?.detail || backendError;
      } else {
        console.error("Non-Axios error occurred:", error);
      }

      const errorMessage: Message = {
        sender: 'ai',
        text: backendError,
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
      {/* Launcher */}
      <Transition
        show={!isOpen}
        as={Fragment}
        enter="transition ease-out duration-200"
        enterFrom="opacity-0 scale-95"
        enterTo="opacity-100 scale-100"
        leave="transition ease-in duration-150"
        leaveFrom="opacity-100 scale-100"
        leaveTo="opacity-0 scale-90"
      >
        <button
          onClick={() => setIsOpen(true)}
          aria-label="Open support chat"
          className="fixed bottom-6 right-6 z-50"
        >
          <div className="h-14 w-14 bg-white rounded-full flex items-center justify-center shadow-md border border-gray-200 hover:shadow-lg transition">
            <MessageCircle className="h-6 w-6 text-slate-900" />
          </div>
        </button>
      </Transition>

      {/* Chat Window */}
      <Transition appear show={isOpen} as={Fragment}>
        <div
          className={`fixed z-50 transition-all duration-300
            ${
              isMinimized
                ? "bottom-6 right-6 w-72"
                : "bottom-0 right-0 w-full h-full sm:bottom-6 sm:right-6 sm:w-[400px] sm:h-[600px] md:w-[450px]"
            }
          `}
        >
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-250"
            enterFrom="opacity-0 scale-95 translate-y-4"
            enterTo="opacity-100 scale-100 translate-y-0"
            leave="ease-in duration-200"
            leaveFrom="opacity-100 scale-100 translate-y-0"
            leaveTo="opacity-0 scale-95 translate-y-4"
          >
            <div
              className={`flex flex-col h-full bg-white shadow-xl overflow-hidden border border-gray-100
                ${isMinimized ? "rounded-2xl" : "sm:rounded-2xl"}
              `}
            >
              {/* Header */}
              <div className="bg-slate-900 px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 flex items-center justify-center">
                    <RobotIllustration className="w-full h-full" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white text-sm">
                      DataPulse AI
                    </h3>
                    <p className="text-xs text-blue-200">Online</p>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={handleNewChat}
                    title="Reset chat"
                    className="p-1.5 text-slate-400 hover:text-white rounded-md hover:bg-white/10"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </button>

                  <button
                    onClick={() => setIsMinimized(!isMinimized)}
                    title={isMinimized ? "Maximize" : "Minimize"}
                    className="p-1.5 text-slate-400 hover:text-white rounded-md hover:bg-white/10 hidden sm:block"
                  >
                    {isMinimized ? (
                      <Maximize2 className="h-4 w-4" />
                    ) : (
                      <Minimize2 className="h-4 w-4" />
                    )}
                  </button>

                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-1.5 text-slate-400 hover:text-white rounded-md hover:bg-white/10"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {!isMinimized && (
                <>
                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto p-4 bg-gray-50 chatbot-scrollbar space-y-4">
                    {messages.length === 1 && !isLoading && (
                      <div className="bg-white p-3 rounded-xl border border-gray-100">
                        <h4 className="text-sm font-semibold text-gray-800 mb-2 flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-amber-500" />
                          Suggested questions
                        </h4>

                        <div className="grid gap-2">
                          {conversationStarters.slice(0, 6).map((q, idx) => (
                            <button
                              key={idx}
                              onClick={() => handleSendMessage(q)}
                              className="text-left text-xs p-2.5 rounded-lg bg-gray-50 hover:bg-blue-50 text-gray-700 border border-gray-100"
                            >
                              {q}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {messages.map((msg, index) => (
                      <div
                        key={index}
                        className={`flex gap-3 ${
                          msg.sender === "user" ? "flex-row-reverse" : ""
                        }`}
                      >
                        <div
                          className={`w-9 h-9 flex items-center justify-center flex-shrink-0 ${
                            msg.sender === "user"
                              ? "rounded-full bg-slate-200"
                              : ""
                          }`}
                        >
                          {msg.sender === "ai" ? (
                            <RobotIllustration className="w-full h-full" />
                          ) : (
                            <User className="w-5 h-5 text-slate-600" />
                          )}
                        </div>

                        <div
                          className={`flex flex-col max-w-[85%] ${
                            msg.sender === "user"
                              ? "items-end"
                              : "items-start"
                          }`}
                        >
                          <div
                            className={`px-4 py-3 text-sm leading-relaxed border ${
                              msg.sender === "user"
                                ? "bg-slate-900 text-white rounded-2xl rounded-tr-none"
                                : "bg-white text-slate-800 rounded-2xl rounded-tl-none"
                            }`}
                          >
                            <ReactMarkdown>{msg.text}</ReactMarkdown>
                          </div>

                          {msg.timestamp && (
                            <span className="text-[10px] text-gray-400 mt-1">
                              {formatTime(msg.timestamp)}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}

                    {isLoading && (
                      <div className="flex gap-3">
                        <div className="w-9 h-9 flex items-center justify-center">
                          <RobotIllustration className="w-full h-full animate-pulse" />
                        </div>
                        <div className="bg-white border border-gray-100 px-4 py-3 rounded-2xl rounded-tl-none flex gap-1">
                          <div className="w-1.5 h-1.5 bg-gray-400 rounded-full typing-dot"></div>
                          <div className="w-1.5 h-1.5 bg-gray-400 rounded-full typing-dot"></div>
                          <div className="w-1.5 h-1.5 bg-gray-400 rounded-full typing-dot"></div>
                        </div>
                      </div>
                    )}

                    <div ref={messagesEndRef} />
                  </div>

                  {/* Input */}
                  <div className="p-3 bg-white border-t border-gray-100">
                    <form
                      onSubmit={handleFormSubmit}
                      className="relative flex items-center"
                    >
                      <input
                        ref={inputRef}
                        type="text"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        placeholder="Ask DataPulse..."
                        disabled={isLoading}
                        className="w-full bg-gray-50 text-base sm:text-sm rounded-xl pl-4 pr-12 py-3 border border-gray-200 focus:border-slate-900 focus:ring-0"
                      />
                      <button
                        type="submit"
                        disabled={isLoading || !inputValue.trim()}
                        className="absolute right-2 p-2 bg-slate-900 text-white rounded-lg disabled:bg-gray-200 disabled:text-gray-400"
                      >
                        <Send className="h-4 w-4" />
                      </button>
                    </form>

                    <p className="text-[10px] text-gray-400 text-center mt-2">
                      AI can make mistakes. Verify important info.
                    </p>
                  </div>
                </>
              )}

              {isMinimized && (
                <div
                  className="p-4 bg-white cursor-pointer hover:bg-gray-50 flex items-center justify-between"
                  onClick={() => setIsMinimized(false)}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
                      <MessageCircle className="w-4 h-4 text-slate-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">Chat hidden</p>
                      <p className="text-xs text-gray-500">Click to expand</p>
                    </div>
                  </div>
                  <Maximize2 className="w-4 h-4 text-gray-400" />
                </div>
              )}
            </div>
          </Transition.Child>
        </div>
      </Transition>
    </>
  );

};
