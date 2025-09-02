'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface CoolLoaderProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'admin' | 'teacher' | 'student';
}

export default function CoolLoader({ 
  message = "Loading...", 
  size = 'md',
  variant = 'default' 
}: CoolLoaderProps) {
  const sizeClasses = {
    sm: 'w-16 h-16',
    md: 'w-32 h-32',
    lg: 'w-48 h-48'
  };

  const textSizes = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-3xl'
  };

  const getVariantColors = () => {
    switch (variant) {
      case 'admin':
        return {
          primary: 'from-red-500 to-red-600',
          secondary: 'from-red-400 to-red-500',
          accent: 'border-red-600',
          text: 'from-red-600 to-red-700'
        };
      case 'teacher':
        return {
          primary: 'from-green-500 to-green-600',
          secondary: 'from-green-400 to-green-500',
          accent: 'border-green-600',
          text: 'from-green-600 to-green-700'
        };
      case 'student':
        return {
          primary: 'from-blue-500 to-purple-600',
          secondary: 'from-blue-400 to-purple-500',
          accent: 'border-blue-600',
          text: 'from-blue-600 to-purple-600'
        };
      default:
        return {
          primary: 'from-blue-500 to-purple-600',
          secondary: 'from-blue-400 to-purple-500',
          accent: 'border-blue-600',
          text: 'from-blue-600 to-purple-600'
        };
    }
  };

  const colors = getVariantColors();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center">
      <div className="text-center">
        <div className="relative mx-auto mb-6">
          {/* Main loader container */}
          <div className={`${sizeClasses[size]} mx-auto relative`}>
            {/* Core logo container with gradient background */}
            <motion.div 
              className={`w-full h-full bg-gradient-to-br ${colors.primary} rounded-full flex items-center justify-center shadow-2xl`}
              animate={{
                scale: [1, 1.05, 1],
                rotate: [0, 5, -5, 0],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            >
              {/* Logo image or placeholder */}
              <motion.img 
                src="/all-07.png" 
                alt="Logo" 
                className={`${size === 'sm' ? 'w-10 h-10' : size === 'md' ? 'w-20 h-20' : 'w-32 h-32'} object-contain`}
                animate={{
                  rotate: [0, 360],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: "linear"
                }}
              />
            </motion.div>
            
            {/* Multiple animated rings */}
            <motion.div 
              className={`absolute inset-0 border-4 ${colors.accent} rounded-full opacity-30`}
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.3, 0.1, 0.3],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
            
            <motion.div 
              className={`absolute inset-0 border-4 ${colors.accent} rounded-full opacity-20`}
              animate={{
                scale: [1, 1.4, 1],
                opacity: [0.2, 0.05, 0.2],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 0.5
              }}
            />
            
            <motion.div 
              className={`absolute inset-0 border-4 ${colors.accent} rounded-full opacity-10`}
              animate={{
                scale: [1, 1.6, 1],
                opacity: [0.1, 0.02, 0.1],
              }}
              transition={{
                duration: 2.5,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 1
              }}
            />
            
            {/* Rotating border with gradient */}
            <motion.div 
              className={`absolute inset-0 border-4 border-transparent border-t-current rounded-full`}
              style={{
                borderTopColor: variant === 'admin' ? '#dc2626' : 
                               variant === 'teacher' ? '#16a34a' : '#2563eb'
              }}
              animate={{
                rotate: [0, 360],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "linear"
              }}
            />
            
            {/* Floating particles */}
            {[...Array(6)].map((_, i) => (
              <motion.div
                key={i}
                className={`absolute w-2 h-2 bg-gradient-to-r ${colors.secondary} rounded-full`}
                style={{
                  left: `${50 + 40 * Math.cos(i * 60 * Math.PI / 180)}%`,
                  top: `${50 + 40 * Math.sin(i * 60 * Math.PI / 180)}%`,
                }}
                animate={{
                  scale: [0, 1, 0],
                  opacity: [0, 1, 0],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: i * 0.3,
                }}
              />
            ))}
          </div>
          
          {/* Loading text with gradient */}
          <motion.div 
            className="mt-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <motion.h2 
              className={`${textSizes[size]} font-bold bg-gradient-to-r ${colors.text} bg-clip-text text-transparent`}
              animate={{
                opacity: [0.7, 1, 0.7],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            >
              {message}
            </motion.h2>
            
            <motion.p 
              className="text-gray-600 dark:text-gray-300 mt-2 text-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.5 }}
            >
              Please wait while we prepare your experience
            </motion.p>
            
            {/* Animated dots */}
            <motion.div className="flex justify-center space-x-1 mt-3">
              {[...Array(3)].map((_, i) => (
                <motion.div
                  key={i}
                  className={`w-2 h-2 rounded-full bg-gradient-to-r ${colors.secondary}`}
                  animate={{
                    scale: [0.5, 1, 0.5],
                    opacity: [0.3, 1, 0.3],
                  }}
                  transition={{
                    duration: 1,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: i * 0.2,
                  }}
                />
              ))}
            </motion.div>
          </motion.div>
        </div>
        
        {/* Background animated elements */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <motion.div
            className={`absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br ${colors.secondary} rounded-full blur-3xl opacity-20`}
            animate={{
              scale: [1, 1.2, 1],
              rotate: [0, 180, 360],
            }}
            transition={{
              duration: 20,
              repeat: Infinity,
              ease: "linear"
            }}
          />
          <motion.div
            className={`absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br ${colors.secondary} rounded-full blur-3xl opacity-20`}
            animate={{
              scale: [1.2, 1, 1.2],
              rotate: [360, 180, 0],
            }}
            transition={{
              duration: 25,
              repeat: Infinity,
              ease: "linear"
            }}
          />
        </div>
      </div>
    </div>
  );
}
