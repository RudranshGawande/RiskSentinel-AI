import { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL } from '../lib/constants';

const CopilotContext = createContext(null);

const DEFAULT_WELCOME_MESSAGE = {
  sender: 'assistant',
  text: "Hello! I am your Risk Co-Pilot. I can investigate specific transactions, explain machine learning risk drivers, or answer queries about system status.\n\nType a message below or select a query to begin."
};

export function CopilotProvider({ children }) {
  const [selectedTransactionId, setSelectedTransactionId] = useState('');
  const [transactionData, setTransactionData] = useState(null);
  const [chatHistory, setChatHistory] = useState([DEFAULT_WELCOME_MESSAGE]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const trimmedId = selectedTransactionId.trim();
    if (!trimmedId) {
      setTransactionData(null);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await axios.get(`${API_URL}/api/audit/${trimmedId}`);
        setTransactionData(res.data);
      } catch (err) {
        setTransactionData(null);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [selectedTransactionId]);

  const searchTransaction = async (txId) => {
    if (!txId.trim()) {
      setTransactionData(null);
      return null;
    }
    try {
      const res = await axios.get(`${API_URL}/api/audit/${txId}`);
      setTransactionData(res.data);
      setSelectedTransactionId(txId);
      return res.data;
    } catch (err) {
      console.error("Failed to fetch transaction details in context", err);
      setTransactionData(null);
      return null;
    }
  };

  const sendMessage = async (text) => {
    if (!text.trim() || isLoading) return;

    const userMessage = { sender: 'user', text };
    setChatHistory(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const payload = {
        message: text,
        transaction_id: selectedTransactionId.trim() || null
      };

      const res = await axios.post(`${API_URL}/api/copilot/chat`, payload);

      const botMessage = {
        sender: 'assistant',
        text: res.data.response,
        context: res.data.transaction_context
      };

      if (res.data.transaction_context) {
        setTransactionData(res.data.transaction_context);
        if (res.data.transaction_context.transaction_id) {
          setSelectedTransactionId(res.data.transaction_context.transaction_id);
        }
      }

      setChatHistory(prev => [...prev, botMessage]);
    } catch (err) {
      console.error("Co-Pilot message delivery failed", err);
      const errorMessage = {
        sender: 'assistant',
        text: "Error: I encountered a connection issue. Please ensure the backend is running and you have configured a valid LLM API key if template fallbacks are disabled.",
        isError: true
      };
      setChatHistory(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const clearSession = () => {
    setChatHistory([DEFAULT_WELCOME_MESSAGE]);
    setSelectedTransactionId('');
    setTransactionData(null);
    setIsLoading(false);
  };

  return (
    <CopilotContext.Provider
      value={{
        selectedTransactionId,
        setSelectedTransactionId,
        transactionData,
        setTransactionData,
        chatHistory,
        isLoading,
        searchTransaction,
        sendMessage,
        clearSession
      }}
    >
      {children}
    </CopilotContext.Provider>
  );
}

export function useCopilot() {
  const context = useContext(CopilotContext);
  if (!context) {
    throw new Error('useCopilot must be used within a CopilotProvider');
  }
  return context;
}
