
import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useApp } from '../contexts/AppContext';

const InfoModal: React.FC = () => {
  const { showInfoModal, setShowInfoModal, infoModalContent, themeClasses } = useApp();

  if (!showInfoModal || !infoModalContent) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="bg-white rounded-[2.5rem] shadow-2xl max-w-md w-full overflow-hidden border border-slate-100"
        >
          <div className="p-8 text-center space-y-6">
            <div className={`w-20 h-20 mx-auto rounded-3xl ${themeClasses.secondary} flex items-center justify-center text-3xl ${themeClasses.text} shadow-inner`}>
              <i className="fa-solid fa-circle-info"></i>
            </div>
            
            <div className="space-y-2">
              <h3 className="text-2xl font-black text-slate-800 tracking-tight">
                {infoModalContent.title}
              </h3>
              <p className="text-slate-500 font-medium leading-relaxed">
                {infoModalContent.message}
              </p>
            </div>

            <button 
              onClick={() => setShowInfoModal(false)}
              className={`w-full py-4 ${themeClasses.button} rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl transition-all active:scale-95`}
            >
              Got it
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default InfoModal;
