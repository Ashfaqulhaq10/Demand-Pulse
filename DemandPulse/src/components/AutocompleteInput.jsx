import React, { useState, useEffect, useRef } from 'react';
import { FaSearch, FaMapMarkerAlt, FaCity, FaTrain, FaPlane } from 'react-icons/fa';

const AutocompleteInput = ({ value, onChange, placeholder, label, transport }) => {
    const [suggestions, setSuggestions] = useState([]);
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const wrapperRef = useRef(null);

    useEffect(() => {
        function handleClickOutside(event) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Internal state for debouncing
    const [debouncedValue, setDebouncedValue] = useState(value);
    const isSelection = useRef(false);

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedValue(value);
        }, 300); // 300ms debounce
        return () => clearTimeout(timer);
    }, [value]);

    useEffect(() => {
        const performSearch = async () => {
            // If the change was from a selection, skip search
            if (isSelection.current) {
                isSelection.current = false;
                return;
            }

            if (debouncedValue && debouncedValue.length > 0) {
                setLoading(true);
                try {
                    const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:8000';
                    const transportParam = transport ? `&transport=${encodeURIComponent(transport)}` : '';
                    const res = await fetch(`${apiBase}/search-locations?q=${encodeURIComponent(debouncedValue)}${transportParam}`);
                    if (res.ok) {
                        const data = await res.json();
                        setSuggestions(data);
                        setIsOpen(true);
                    }
                } catch (err) {
                    console.error("Search error:", err);
                } finally {
                    setLoading(false);
                }
            } else {
                setSuggestions([]);
                setIsOpen(false);
            }
        };

        performSearch();
    }, [debouncedValue]);

    const handleInputChange = (e) => {
        isSelection.current = false;
        onChange(e.target.value);
    };

    const handleSelect = (loc) => {
        isSelection.current = true;
        onChange(loc.name);
        setSuggestions([]); // Clear suggestions on select
        setIsOpen(false);
    };

    return (
        <div className="input-group" ref={wrapperRef} style={{ position: 'relative', zIndex: isOpen ? 1001 : 1 }}>
            <label>{label}</label>
            <div className="autocomplete-wrapper" style={{ position: 'relative' }}>
                <FaMapMarkerAlt className="autocomplete-icon" />
                <input
                    type="text"
                    value={value}
                    onChange={handleInputChange}
                    placeholder={placeholder}
                    autoComplete="off"
                    className="autocomplete-input"
                    style={{ width: '100%', paddingLeft: '35px' }}
                />

                {loading && (
                    <div style={{ position: 'absolute', right: '10px', top: '10px', fontSize: '0.8rem', color: '#94a3b8' }}>
                        Searching...
                    </div>
                )}

                {isOpen && suggestions.length > 0 && (
                    <ul className="suggestions-list" style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        background: '#fff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        marginTop: '4px',
                        zIndex: 1000,
                        maxHeight: '300px',
                        overflowY: 'auto',
                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                        padding: '4px 0',
                        listStyle: 'none'
                    }}>
                        {suggestions.map((loc, i) => (
                            <li
                                key={i}
                                onClick={() => handleSelect(loc)}
                                className="suggestion-item"
                                style={{
                                    padding: '10px 15px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    borderBottom: i < suggestions.length - 1 ? '1px solid #f1f5f9' : 'none'
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    {loc.type === 'Railway Station' ? <FaTrain size={12} color="#64748b" /> :
                                        loc.type === 'Airport' ? <FaPlane size={12} color="#64748b" /> :
                                            <FaCity size={12} color="#64748b" />}
                                    <span style={{ fontWeight: '600', color: '#1e293b', fontSize: '0.9rem' }}>{loc.name}</span>
                                </div>
                                <div style={{ display: 'flex', gap: '8px', marginTop: '2px', marginLeft: '20px' }}>
                                    <span style={{ color: '#64748b', fontSize: '0.75rem' }}>
                                        {loc.type} {loc.code ? `(${loc.code})` : ""}
                                        {loc.district ? ` • ${loc.district}` : ""}
                                        {loc.state ? `, ${loc.state}` : ""}
                                    </span>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
};

export default AutocompleteInput;
