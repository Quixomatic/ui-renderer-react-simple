/**
 * Example: React Hooks in ServiceNow Components
 * 
 * This example demonstrates how to use React 18 hooks
 * within ServiceNow components.
 */

// Component index.js
import { createCustomElement } from "@servicenow/ui-core";
import react from "@servicenow/ui-renderer-react";
import view from "./view";

createCustomElement("hooks-example", {
    renderer: { type: react },
    view,
    properties: {
        initialMessage: {
            default: "React 18 Hooks Example"
        }
    }
});

// Component view.js
import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";

export default function HooksExample(state) {
    const { properties } = state;
    const { initialMessage } = properties;
    
    // useState hook
    const [message, setMessage] = useState(initialMessage);
    const [count, setCount] = useState(0);
    const [isVisible, setIsVisible] = useState(true);
    
    // useRef hook
    const inputRef = useRef(null);
    const countRef = useRef(0);
    
    // useEffect hook
    useEffect(() => {
        console.log('Component mounted');
        
        // Cleanup function
        return () => {
            console.log('Component unmounted');
        };
    }, []);
    
    // useEffect with dependencies
    useEffect(() => {
        document.title = `Count: ${count}`;
        countRef.current = count;
    }, [count]);
    
    // useCallback hook
    const handleIncrement = useCallback(() => {
        setCount(prev => prev + 1);
    }, []);
    
    const handleDecrement = useCallback(() => {
        setCount(prev => prev - 1);
    }, []);
    
    // useMemo hook
    const expensiveValue = useMemo(() => {
        console.log('Computing expensive value...');
        return count * 2;
    }, [count]);
    
    // Focus input handler
    const focusInput = () => {
        inputRef.current?.focus();
    };
    
    return (
        <div className="hooks-example">
            <h1>{message}</h1>
            
            <div className="section">
                <h2>useState Hook</h2>
                <input
                    ref={inputRef}
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Update message"
                />
                <button onClick={focusInput}>Focus Input (useRef)</button>
            </div>
            
            <div className="section">
                <h2>Counter with useCallback</h2>
                <div className="counter">
                    <button onClick={handleDecrement}>-</button>
                    <span>Count: {count}</span>
                    <button onClick={handleIncrement}>+</button>
                </div>
                <p>Expensive value (useMemo): {expensiveValue}</p>
            </div>
            
            <div className="section">
                <h2>Conditional Rendering</h2>
                <button onClick={() => setIsVisible(!isVisible)}>
                    {isVisible ? 'Hide' : 'Show'} Content
                </button>
                {isVisible && (
                    <ConditionalComponent count={count} />
                )}
            </div>
            
            <div className="section">
                <h2>useEffect Demo</h2>
                <p>Check the console for lifecycle messages</p>
                <p>Check the browser tab title for count updates</p>
            </div>
        </div>
    );
}

// Child component to demonstrate conditional rendering
function ConditionalComponent({ count }) {
    useEffect(() => {
        console.log('ConditionalComponent mounted');
        return () => console.log('ConditionalComponent unmounted');
    }, []);
    
    return (
        <div className="conditional-content">
            <p>This content can be toggled!</p>
            <p>Current count from parent: {count}</p>
        </div>
    );
}

// Component styles.scss
/*
.hooks-example {
    padding: 20px;
    max-width: 600px;
    margin: 0 auto;
    
    h1 {
        color: #0066cc;
        text-align: center;
        margin-bottom: 30px;
    }
    
    .section {
        margin-bottom: 30px;
        padding: 20px;
        border: 1px solid #ddd;
        border-radius: 8px;
        
        h2 {
            color: #333;
            margin-top: 0;
            margin-bottom: 15px;
        }
        
        input {
            padding: 8px 12px;
            border: 1px solid #ccc;
            border-radius: 4px;
            margin-right: 10px;
            width: 200px;
        }
        
        button {
            padding: 8px 16px;
            background: #0066cc;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            margin-right: 10px;
            
            &:hover {
                background: #0052a3;
            }
        }
        
        .counter {
            display: flex;
            align-items: center;
            gap: 15px;
            margin: 15px 0;
            
            span {
                font-size: 18px;
                font-weight: bold;
            }
        }
        
        .conditional-content {
            background: #f0f8ff;
            padding: 15px;
            border-radius: 4px;
            margin-top: 15px;
            
            p {
                margin: 5px 0;
            }
        }
    }
}
*/