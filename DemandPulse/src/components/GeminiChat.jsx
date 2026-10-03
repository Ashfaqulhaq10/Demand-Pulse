import { useState, useRef, useEffect } from 'react';
import { FaVolumeUp, FaStop, FaMicrophone, FaMicrophoneSlash } from 'react-icons/fa';

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

const GeminiLogo = ({ className }) => (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        <path d="M12 2L14.5 9.5H22L16 14.5L18.5 22L12 17.5L5.5 22L8 14.5L2 9.5H9.5L12 2Z" fill="currentColor" />
        <path d="M12 6L13.5 10.5H18L14.5 13.5L16 18L12 15L8 18L9.5 13.5L6 10.5H10.5L12 6Z" fill="white" fillOpacity="0.3" />
    </svg>
);

const GeminiChat = ({ externalMessage, onOpen }) => {
    const [messages, setMessages] = useState([
        { role: 'ai', text: 'Hello! I am your Gemini AI assistant. How can I help you today?' }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [language, setLanguage] = useState('English');
    const [isSpeaking, setIsSpeaking] = useState(null); // Track which index is being read
    const [isListening, setIsListening] = useState(false);
    const messagesEndRef = useRef(null);
    const hasProcessedRef = useRef(null);
    const synthRef = useRef(window.speechSynthesis);
    const recognitionRef = useRef(null);

    useEffect(() => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRecognition) {
            recognitionRef.current = new SpeechRecognition();
            recognitionRef.current.continuous = false;
            recognitionRef.current.interimResults = false;

            recognitionRef.current.onresult = (event) => {
                const transcript = event.results[0][0].transcript;
                setInput(transcript);
                setIsListening(false);
                // Optionally send immediately:
                // handleSend({ preventDefault: () => {}, target: { value: transcript } });
            };

            recognitionRef.current.onerror = (event) => {
                console.error("Speech recognition error", event.error);
                setIsListening(false);
            };

            recognitionRef.current.onend = () => {
                setIsListening(false);
            };
        }
    }, []);

    const toggleListening = () => {
        if (!recognitionRef.current) {
            alert("Speech recognition is not supported in this browser.");
            return;
        }

        if (isListening) {
            recognitionRef.current.stop();
            setIsListening(false);
        } else {
            // Map common languages to codes for STT
            const langMap = {
                'English': 'en-US',
                'Hindi': 'hi-IN',
                'Bengali': 'bn-IN',
                'Tamil': 'ta-IN',
                'Telugu': 'te-IN',
                'Marathi': 'mr-IN',
                'Gujarati': 'gu-IN'
            };
            recognitionRef.current.lang = langMap[language] || 'en-US';
            recognitionRef.current.start();
            setIsListening(true);
        }
    };

    useEffect(() => {
        if (externalMessage && hasProcessedRef.current !== externalMessage) {
            hasProcessedRef.current = externalMessage;
            setIsOpen(true);
            if (onOpen) onOpen();

            setMessages(prev => [...prev, { role: 'user', text: externalMessage }]);
            processAIRequest(externalMessage);
        }
    }, [externalMessage]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isLoading]);

    const speak = (text, index) => {
        if (isSpeaking === index) {
            synthRef.current.cancel();
            setIsSpeaking(null);
            return;
        }

        synthRef.current.cancel();
        const utterance = new SpeechSynthesisUtterance(text);

        // Map common languages to codes for TTS
        const langMap = {
            'English': 'en-US',
            'Hindi': 'hi-IN',
            'Bengali': 'bn-IN',
            'Tamil': 'ta-IN',
            'Telugu': 'te-IN',
            'Marathi': 'mr-IN',
            'Gujarati': 'gu-IN'
        };

        utterance.lang = langMap[language] || 'en-US';
        utterance.onend = () => setIsSpeaking(null);
        utterance.onerror = () => setIsSpeaking(null);

        setIsSpeaking(index);
        synthRef.current.speak(utterance);
    };

    const processAIRequest = async (userMessage) => {
        setIsLoading(true);
        try {
            if (!GEMINI_API_KEY) throw new Error("API key missing");

            const prompt = `Assistant Language: ${language}. Please respond ONLY in ${language}. If the user input is in English, translate your detailed travel analysis to ${language} naturally. \n\nUser Input: ${userMessage}`;

            const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;
            const response = await fetch(GEMINI_API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }]
                })
            });

            const data = await response.json();

            // Re-added detailed error check
            if (data.error) {
                throw new Error(data.error.message || "Unknown API error");
            }

            const aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;

            if (!aiResponse) throw new Error("No response");
            setMessages(prev => [...prev, { role: 'ai', text: aiResponse }]);
        } catch (error) {
            setMessages(prev => [...prev, { role: 'ai', text: `Error: ${error.message}` }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSend = async (e) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;
        const userMsg = input.trim();
        setInput('');
        setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
        await processAIRequest(userMsg);
    };

    return (
        <div className={`gemini-chat-container ${isOpen ? 'open' : ''}`}>
            {!isOpen && (
                <button className="chat-toggle-btn" onClick={() => setIsOpen(true)}>
                    <GeminiLogo className="bot-icon" />
                    <span className="btn-text">Ask Gemini AI</span>
                </button>
            )}

            {isOpen && (
                <div className="chat-window fade-in">
                    <div className="chat-header">
                        <div className="header-info">
                            <GeminiLogo className="bot-status-icon" />
                            <div className="header-text">
                                <h3>Gemini AI</h3>
                            </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                            <select
                                className="language-selector"
                                value={language}
                                onChange={(e) => setLanguage(e.target.value)}
                            >
                                <option>English</option>
                                <option>Hindi</option>
                                <option>Bengali</option>
                                <option>Marathi</option>
                                <option>Tamil</option>
                                <option>Telugu</option>
                                <option>Gujarati</option>
                            </select>
                            <button className="close-btn" onClick={() => setIsOpen(false)}>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                            </button>
                        </div>
                    </div>

                    <div className="messages-container">
                        {messages.map((msg, idx) => (
                            <div key={idx} className={`message-wrapper ${msg.role}`}>
                                <div className="message-bubble">
                                    {msg.text}
                                    {msg.role === 'ai' && (
                                        <div className="audio-control-wrap">
                                            <button
                                                className={`audio-btn ${isSpeaking === idx ? 'playing' : ''}`}
                                                onClick={() => speak(msg.text, idx)}
                                                title="Read aloud"
                                            >
                                                {isSpeaking === idx ? <FaStop size={14} /> : <FaVolumeUp size={14} />}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                        {isLoading && (
                            <div className="message-wrapper ai">
                                <div className="message-bubble loading">
                                    <div className="typing-dot"></div><div className="typing-dot"></div><div className="typing-dot"></div>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    <form className="chat-input-form" onSubmit={handleSend}>
                        <button
                            type="button"
                            className={`mic-btn ${isListening ? 'listening' : ''}`}
                            onClick={toggleListening}
                            title={isListening ? "Stop listening" : "Voice command"}
                            disabled={isLoading}
                        >
                            {isListening ? <FaMicrophoneSlash size={16} /> : <FaMicrophone size={16} />}
                        </button>
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder={isListening ? "Listening..." : "Type a message..."}
                            disabled={isLoading}
                        />
                        <button type="submit" disabled={isLoading || !input.trim()}>
                            {isLoading ? <div className="spinner"></div> : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>}
                        </button>
                    </form>
                </div>
            )}
        </div>
    );
};

export default GeminiChat;
