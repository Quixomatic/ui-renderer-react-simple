/**
 * Example: Basic React Component for ServiceNow
 * 
 * This example shows how to create a simple React component
 * that works with ServiceNow's component system.
 */

// Component index.js
import { createCustomElement } from "@servicenow/ui-core";
import react from "@servicenow/ui-renderer-react";
import view from "./view";
import styles from "./styles.scss";

createCustomElement("basic-example", {
    renderer: { type: react },
    view,
    properties: {
        title: {
            default: "Hello ServiceNow!"
        },
        count: {
            default: 0
        }
    },
    actionHandlers: {
        INCREMENT: ({ state, updateProperties }) => {
            const { properties } = state;
            updateProperties({
                count: properties.count + 1
            });
        },
        DECREMENT: ({ state, updateProperties }) => {
            const { properties } = state;
            updateProperties({
                count: properties.count - 1
            });
        }
    },
    styles
});

// Component view.js
import React from "react";

export default function BasicExample(state) {
    const { dispatch, properties } = state;
    const { title, count } = properties;
    
    return (
        <div className="basic-example">
            <h1>{title}</h1>
            <div className="counter">
                <button onClick={() => dispatch('DECREMENT')}>-</button>
                <span className="count">{count}</span>
                <button onClick={() => dispatch('INCREMENT')}>+</button>
            </div>
        </div>
    );
}

// Component styles.scss
/*
.basic-example {
    padding: 20px;
    text-align: center;
    
    h1 {
        color: #0066cc;
        margin-bottom: 20px;
    }
    
    .counter {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 15px;
        
        button {
            padding: 10px 20px;
            font-size: 18px;
            border: none;
            border-radius: 4px;
            background: #0066cc;
            color: white;
            cursor: pointer;
            
            &:hover {
                background: #0052a3;
            }
        }
        
        .count {
            font-size: 24px;
            font-weight: bold;
            min-width: 40px;
        }
    }
}
*/