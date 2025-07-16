/**
 * Example: Form Component with Validation
 * 
 * This example shows how to create a form component with
 * validation that integrates with ServiceNow's state management.
 */

// Component index.js
import { createCustomElement } from "@servicenow/ui-core";
import react from "@servicenow/ui-renderer-react";
import view from "./view";
import styles from "./styles.scss";

createCustomElement("form-example", {
    renderer: { type: react },
    view,
    properties: {
        title: {
            default: "User Registration Form"
        },
        submitUrl: {
            default: "/api/users"
        }
    },
    initialState: {
        formData: null,
        isSubmitting: false,
        submitSuccess: false
    },
    actionHandlers: {
        FORM_SUBMIT: ({ action, state, updateState, dispatch }) => {
            const { formData } = action.payload;
            
            updateState({ isSubmitting: true });
            
            // Simulate API call
            setTimeout(() => {
                updateState({ 
                    isSubmitting: false,
                    submitSuccess: true,
                    formData: formData
                });
                
                dispatch('FORM_SUBMITTED', { formData });
            }, 1000);
        },
        FORM_RESET: ({ updateState }) => {
            updateState({
                formData: null,
                isSubmitting: false,
                submitSuccess: false
            });
        }
    },
    styles
});

// Component view.js
import React, { useState, useEffect } from "react";

export default function FormExample(state) {
    const { dispatch, properties } = state;
    const { title } = properties;
    const { isSubmitting, submitSuccess, formData } = state;
    
    // Form state
    const [form, setForm] = useState({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        department: '',
        message: ''
    });
    
    // Validation state
    const [errors, setErrors] = useState({});
    const [touched, setTouched] = useState({});
    
    // Handle input changes
    const handleChange = (field) => (e) => {
        const value = e.target.value;
        setForm(prev => ({
            ...prev,
            [field]: value
        }));
        
        // Clear error when user starts typing
        if (errors[field]) {
            setErrors(prev => ({
                ...prev,
                [field]: ''
            }));
        }
    };
    
    // Handle field blur
    const handleBlur = (field) => () => {
        setTouched(prev => ({
            ...prev,
            [field]: true
        }));
        
        validateField(field, form[field]);
    };
    
    // Validate individual field
    const validateField = (field, value) => {
        let error = '';
        
        switch (field) {
            case 'firstName':
            case 'lastName':
                if (!value.trim()) {
                    error = 'This field is required';
                } else if (value.length < 2) {
                    error = 'Must be at least 2 characters';
                }
                break;
                
            case 'email':
                if (!value.trim()) {
                    error = 'Email is required';
                } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
                    error = 'Please enter a valid email address';
                }
                break;
                
            case 'phone':
                if (value && !/^\d{3}-?\d{3}-?\d{4}$/.test(value)) {
                    error = 'Please enter a valid phone number (xxx-xxx-xxxx)';
                }
                break;
                
            case 'department':
                if (!value) {
                    error = 'Please select a department';
                }
                break;
                
            case 'message':
                if (!value.trim()) {
                    error = 'Message is required';
                } else if (value.length < 10) {
                    error = 'Message must be at least 10 characters';
                }
                break;
        }
        
        if (error) {
            setErrors(prev => ({
                ...prev,
                [field]: error
            }));
        }
        
        return !error;
    };
    
    // Validate entire form
    const validateForm = () => {
        const fields = ['firstName', 'lastName', 'email', 'department', 'message'];
        let isValid = true;
        
        fields.forEach(field => {
            const fieldValid = validateField(field, form[field]);
            if (!fieldValid) isValid = false;
        });
        
        // Mark all fields as touched
        const allTouched = fields.reduce((acc, field) => {
            acc[field] = true;
            return acc;
        }, {});
        setTouched(allTouched);
        
        return isValid;
    };
    
    // Handle form submission
    const handleSubmit = (e) => {
        e.preventDefault();
        
        if (validateForm()) {
            dispatch('FORM_SUBMIT', { formData: form });
        }
    };
    
    // Reset form
    const handleReset = () => {
        setForm({
            firstName: '',
            lastName: '',
            email: '',
            phone: '',
            department: '',
            message: ''
        });
        setErrors({});
        setTouched({});
        dispatch('FORM_RESET');
    };
    
    // Auto-format phone number
    useEffect(() => {
        if (form.phone) {
            const cleaned = form.phone.replace(/\D/g, '');
            if (cleaned.length <= 10) {
                let formatted = cleaned;
                if (cleaned.length > 3) {
                    formatted = cleaned.slice(0, 3) + '-' + cleaned.slice(3);
                }
                if (cleaned.length > 6) {
                    formatted = cleaned.slice(0, 3) + '-' + cleaned.slice(3, 6) + '-' + cleaned.slice(6);
                }
                
                if (formatted !== form.phone) {
                    setForm(prev => ({ ...prev, phone: formatted }));
                }
            }
        }
    }, [form.phone]);
    
    if (submitSuccess) {
        return (
            <div className="form-example">
                <div className="success-message">
                    <h2>✅ Form Submitted Successfully!</h2>
                    <div className="submitted-data">
                        <h3>Submitted Data:</h3>
                        <pre>{JSON.stringify(formData, null, 2)}</pre>
                    </div>
                    <button onClick={handleReset} className="btn btn-secondary">
                        Submit Another Form
                    </button>
                </div>
            </div>
        );
    }
    
    return (
        <div className="form-example">
            <h1>{title}</h1>
            
            <form onSubmit={handleSubmit} className="registration-form">
                <div className="form-row">
                    <div className="form-group">
                        <label htmlFor="firstName">First Name *</label>
                        <input
                            type="text"
                            id="firstName"
                            value={form.firstName}
                            onChange={handleChange('firstName')}
                            onBlur={handleBlur('firstName')}
                            className={errors.firstName && touched.firstName ? 'error' : ''}
                            disabled={isSubmitting}
                        />
                        {errors.firstName && touched.firstName && (
                            <span className="error-message">{errors.firstName}</span>
                        )}
                    </div>
                    
                    <div className="form-group">
                        <label htmlFor="lastName">Last Name *</label>
                        <input
                            type="text"
                            id="lastName"
                            value={form.lastName}
                            onChange={handleChange('lastName')}
                            onBlur={handleBlur('lastName')}
                            className={errors.lastName && touched.lastName ? 'error' : ''}
                            disabled={isSubmitting}
                        />
                        {errors.lastName && touched.lastName && (
                            <span className="error-message">{errors.lastName}</span>
                        )}
                    </div>
                </div>
                
                <div className="form-group">
                    <label htmlFor="email">Email Address *</label>
                    <input
                        type="email"
                        id="email"
                        value={form.email}
                        onChange={handleChange('email')}
                        onBlur={handleBlur('email')}
                        className={errors.email && touched.email ? 'error' : ''}
                        disabled={isSubmitting}
                    />
                    {errors.email && touched.email && (
                        <span className="error-message">{errors.email}</span>
                    )}
                </div>
                
                <div className="form-row">
                    <div className="form-group">
                        <label htmlFor="phone">Phone Number</label>
                        <input
                            type="tel"
                            id="phone"
                            value={form.phone}
                            onChange={handleChange('phone')}
                            onBlur={handleBlur('phone')}
                            placeholder="123-456-7890"
                            className={errors.phone && touched.phone ? 'error' : ''}
                            disabled={isSubmitting}
                        />
                        {errors.phone && touched.phone && (
                            <span className="error-message">{errors.phone}</span>
                        )}
                    </div>
                    
                    <div className="form-group">
                        <label htmlFor="department">Department *</label>
                        <select
                            id="department"
                            value={form.department}
                            onChange={handleChange('department')}
                            onBlur={handleBlur('department')}
                            className={errors.department && touched.department ? 'error' : ''}
                            disabled={isSubmitting}
                        >
                            <option value="">Select Department</option>
                            <option value="hr">Human Resources</option>
                            <option value="it">Information Technology</option>
                            <option value="finance">Finance</option>
                            <option value="marketing">Marketing</option>
                            <option value="sales">Sales</option>
                            <option value="operations">Operations</option>
                        </select>
                        {errors.department && touched.department && (
                            <span className="error-message">{errors.department}</span>
                        )}
                    </div>
                </div>
                
                <div className="form-group">
                    <label htmlFor="message">Message *</label>
                    <textarea
                        id="message"
                        value={form.message}
                        onChange={handleChange('message')}
                        onBlur={handleBlur('message')}
                        rows="4"
                        className={errors.message && touched.message ? 'error' : ''}
                        disabled={isSubmitting}
                        placeholder="Tell us about your request..."
                    />
                    {errors.message && touched.message && (
                        <span className="error-message">{errors.message}</span>
                    )}
                </div>
                
                <div className="form-actions">
                    <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? 'Submitting...' : 'Submit Form'}
                    </button>
                    
                    <button
                        type="button"
                        onClick={handleReset}
                        className="btn btn-secondary"
                        disabled={isSubmitting}
                    >
                        Reset Form
                    </button>
                </div>
            </form>
        </div>
    );
}

// Component styles.scss
/*
.form-example {
    max-width: 600px;
    margin: 0 auto;
    padding: 20px;
    
    h1 {
        color: #0066cc;
        text-align: center;
        margin-bottom: 30px;
    }
    
    .registration-form {
        background: white;
        padding: 30px;
        border-radius: 8px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        
        .form-row {
            display: flex;
            gap: 20px;
            
            .form-group {
                flex: 1;
            }
        }
        
        .form-group {
            margin-bottom: 20px;
            
            label {
                display: block;
                margin-bottom: 5px;
                font-weight: 600;
                color: #333;
            }
            
            input, select, textarea {
                width: 100%;
                padding: 10px 12px;
                border: 2px solid #ddd;
                border-radius: 4px;
                font-size: 14px;
                transition: border-color 0.3s;
                
                &:focus {
                    outline: none;
                    border-color: #0066cc;
                }
                
                &.error {
                    border-color: #dc3545;
                }
                
                &:disabled {
                    background: #f8f9fa;
                    cursor: not-allowed;
                }
            }
            
            .error-message {
                color: #dc3545;
                font-size: 12px;
                margin-top: 5px;
                display: block;
            }
        }
        
        .form-actions {
            display: flex;
            gap: 15px;
            justify-content: flex-end;
            margin-top: 30px;
            
            .btn {
                padding: 12px 24px;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-size: 14px;
                font-weight: 600;
                transition: all 0.3s;
                
                &:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                }
                
                &.btn-primary {
                    background: #0066cc;
                    color: white;
                    
                    &:hover:not(:disabled) {
                        background: #0052a3;
                    }
                }
                
                &.btn-secondary {
                    background: #6c757d;
                    color: white;
                    
                    &:hover:not(:disabled) {
                        background: #5a6268;
                    }
                }
            }
        }
    }
    
    .success-message {
        text-align: center;
        padding: 40px;
        background: white;
        border-radius: 8px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        
        h2 {
            color: #28a745;
            margin-bottom: 20px;
        }
        
        .submitted-data {
            margin: 30px 0;
            text-align: left;
            
            h3 {
                color: #333;
                margin-bottom: 10px;
            }
            
            pre {
                background: #f8f9fa;
                padding: 15px;
                border-radius: 4px;
                overflow-x: auto;
                font-size: 13px;
            }
        }
    }
}
*/