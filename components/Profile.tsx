
import React, { useState, useRef } from 'react';
import { NavLink } from 'react-router-dom';
import { User } from '../types';
import { notificationService } from '../services/notificationService';
import { useApp } from '../contexts/AppContext';

const Profile: React.FC = () => {
  const { currentUser: user, updateUser: onUpdateUser, themeClasses } = useApp();
  const [isEditing, setIsEditing] = useState(false);
  const [isTestingNotifs, setIsTestingNotifs] = useState(false);
  const [editData, setEditData] = useState<Partial<User>>({
    name: user.name,
    email: user.email,
    phoneNumber: user.phoneNumber || '',
    themeColor: user.themeColor || undefined,
  });
  const [language, setLanguage] = useState('English');
  const [notifications, setNotifications] = useState({
    email: true,
    push: notificationService.hasPermission(),
    sms: false
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        onUpdateUser({ ...user, profileImage: base64String });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = () => {
    onUpdateUser({
      ...user,
      name: editData.name || user.name,
      email: editData.email || user.email,
      phoneNumber: editData.phoneNumber || user.phoneNumber,
      themeColor: editData.themeColor,
    });
    setIsEditing(false);
  };

  const toggleNotif = async (key: keyof typeof notifications) => {
    if (key === 'push' && !notifications.push) {
      const granted = await notificationService.requestPermission();
      setNotifications(prev => ({ ...prev, push: granted }));
      return;
    }
    setNotifications(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const testPushNotification = () => {
    setIsTestingNotifs(true);
    notificationService.showNotification("Appointment Reminder", {
      body: "You have a session with Dr. Sarah Smith in 15 minutes. Prepare your quiet space.",
      tag: "test-reminder",
    });
    setTimeout(() => setIsTestingNotifs(false), 2000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200 overflow-hidden">
        <div className={`h-40 bg-gradient-to-r ${themeClasses.gradient} relative`}>
          <div className="absolute inset-0 opacity-10 flex items-center justify-center pointer-events-none">
            <i className="fa-solid fa-heart-pulse text-[10rem]"></i>
          </div>
        </div>
        <div className="px-10 pb-10 -mt-16 relative z-10">
          <div className="flex flex-col md:flex-row items-end gap-6 text-center md:text-left">
            <div className="relative group mx-auto md:mx-0">
              <div className={`w-32 h-32 bg-white rounded-3xl shadow-2xl border-4 border-white flex items-center justify-center text-4xl font-black ${themeClasses.text} overflow-hidden`}>
                {user.profileImage ? (
                  <img src={user.profileImage} alt={user.name} className="w-full h-full object-cover" />
                ) : (
                  user.name.charAt(0)
                )}
              </div>
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white rounded-3xl cursor-pointer"
              >
                <i className="fa-solid fa-camera mb-1"></i>
                <span className="text-[10px] font-bold uppercase">Change</span>
              </button>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleImageUpload} 
                className="hidden" 
                accept="image/*"
              />
            </div>
            <div className="flex-1 pb-2">
              {isEditing ? (
                <input 
                  className={`text-3xl font-black text-slate-800 tracking-tight bg-slate-50 border ${themeClasses.border} rounded-xl px-4 py-1 outline-none ${themeClasses.ring} w-full`}
                  value={editData.name}
                  onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                  autoFocus
                />
              ) : (
                <h2 className="text-3xl font-black text-slate-800 tracking-tight">{user.name}</h2>
              )}
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 mt-2">
                <span className={`text-[10px] font-black ${themeClasses.text} ${themeClasses.secondary} px-3 py-1.5 rounded-full uppercase tracking-widest`}>
                  {user.role.replace('_', ' ')}
                </span>
                <span className="text-xs font-bold text-slate-400">Member since Oct 2023</span>
              </div>
            </div>
            <div className="pb-2 flex gap-2">
              {isEditing ? (
                <>
                  <button 
                    onClick={() => setIsEditing(false)}
                    className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-black uppercase tracking-widest transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleSave}
                    className={`px-6 py-2.5 ${themeClasses.primary} ${themeClasses.hover} text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg ${themeClasses.shadow}`}
                  >
                    Save Changes
                  </button>
                </>
              ) : (
                <button 
                  onClick={() => setIsEditing(true)}
                  className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-black uppercase tracking-widest transition-all"
                >
                  Edit Profile
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="px-10 pb-10 border-t border-slate-50 pt-10 grid grid-cols-1 md:grid-cols-2 gap-10">
          <section className="space-y-8">
            <div className="space-y-6">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Personal Information</h3>
              <div className="grid grid-cols-1 gap-6">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Email Address</label>
                  <p className="text-sm font-bold text-slate-800">{user.email}</p>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Phone Number</label>
                  {isEditing ? (
                    <input 
                      className={`w-full mt-1 p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none ${themeClasses.ring}`}
                      value={editData.phoneNumber}
                      onChange={(e) => setEditData({ ...editData, phoneNumber: e.target.value })}
                    />
                  ) : (
                    <p className="text-sm font-bold text-slate-800">{user.phoneNumber}</p>
                  )}
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Preferred Language</label>
                  <select 
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className={`w-full mt-1 p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none ${themeClasses.ring} transition-all cursor-pointer`}
                  >
                    <option>English</option>
                    <option>Urdu</option>
                    <option>Punjabi</option>
                    <option>Sindhi</option>
                    <option>Pushto</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="space-y-6 pt-6 border-t border-slate-50">
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Notification Preferences</h3>
                {notifications.push && (
                  <button 
                    onClick={testPushNotification}
                    disabled={isTestingNotifs}
                    className={`text-[10px] font-black ${themeClasses.text} uppercase tracking-widest hover:underline disabled:opacity-50`}
                  >
                    {isTestingNotifs ? "Testing..." : "Test Push Notification"}
                  </button>
                )}
              </div>
              <div className="space-y-4">
                {[
                  { id: 'email', label: 'Email Reminders', desc: 'Receive assignment alerts via email' },
                  { id: 'push', label: 'Push Notifications', desc: 'Real-time alerts for appointments and deadlines' },
                  { id: 'sms', label: 'SMS Alerts', desc: 'Important clinical check-ins via text message', disabled: true },
                ].map((item) => (
                  <div key={item.id} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-slate-700">{item.label}</p>
                      <p className="text-[10px] text-slate-400 font-medium">{item.desc}</p>
                    </div>
                    <button 
                      onClick={() => !item.disabled && toggleNotif(item.id as any)}
                      disabled={item.disabled}
                      className={`w-12 h-6 rounded-full relative transition-all ${
                        notifications[item.id as keyof typeof notifications] ? themeClasses.primary : 'bg-slate-200'
                      } ${item.disabled ? 'opacity-30 cursor-not-allowed' : ''}`}
                    >
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${
                        notifications[item.id as keyof typeof notifications] ? 'right-1' : 'left-1'
                      }`}></div>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="space-y-6">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">App Appearance</h3>
            <div className="space-y-4">
              <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Select Theme Color</p>
              <div className="grid grid-cols-4 gap-3">
                {[
                  { id: 'default', name: 'Baby Blue', color: 'bg-sky-400' },
                  { id: 'green', name: 'Baby Green', color: 'bg-emerald-400' },
                  { id: 'pink', name: 'Baby Pink', color: 'bg-pink-400' },
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setEditData({ ...editData, themeColor: t.id as any })}
                    disabled={!isEditing}
                    className={`p-3 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${
                      editData.themeColor === t.id || (!editData.themeColor && t.id === 'default')
                        ? `border-slate-800 bg-slate-50` 
                        : 'border-transparent bg-slate-50 hover:border-slate-200'
                    } ${!isEditing ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <div className={`w-8 h-8 ${t.color} rounded-full shadow-inner`}></div>
                    <span className="text-[8px] font-black uppercase tracking-tighter">{t.name}</span>
                  </button>
                ))}
              </div>
            </div>

            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest pt-6">Clinic Affiliation</h3>
            <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-4">
               <div className={`w-12 h-12 bg-white rounded-xl flex items-center justify-center text-xl ${themeClasses.text} shadow-sm border border-slate-100`}>
                  <i className="fa-solid fa-hospital"></i>
               </div>
               <div>
                  <p className="text-sm font-bold text-slate-800">Central Wellness Clinic</p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Clinic ID: {user.clinicId || 'C-1004'}</p>
               </div>
               <NavLink to="/session" className={`ml-auto ${themeClasses.text} font-black text-[10px] uppercase tracking-widest hover:underline`}>Connect</NavLink>
            </div>
            
            <div className="bg-emerald-50 p-6 rounded-2xl border border-emerald-100">
               <div className="flex items-center gap-3 text-emerald-700 font-bold text-sm mb-2">
                  <i className="fa-solid fa-check-double"></i>
                  HIPAA Verified Account
               </div>
               <p className="text-[10px] text-emerald-600 leading-relaxed font-medium">Your identity was verified via ID.me on Oct 12, 2023. Compliance status: Active.</p>
            </div>
          </section>
        </div>
      </div>

      <div className="bg-rose-50 border border-rose-100 p-8 rounded-[2rem] flex flex-col md:flex-row gap-6 items-center">
        <div className="w-16 h-16 bg-rose-600 text-white rounded-[1.5rem] flex items-center justify-center text-2xl shadow-lg shadow-rose-100">
          <i className="fa-solid fa-phone-flip"></i>
        </div>
        <div className="flex-1 text-center md:text-left">
          <h3 className="text-xl font-bold text-rose-900 mb-1">Crisis Support Network</h3>
          <p className="text-sm text-rose-700 leading-relaxed opacity-80 font-medium">Immediate, free support is available 24/7. You don't have to carry this alone.</p>
        </div>
        <button className="px-8 py-3.5 bg-rose-600 text-white rounded-2xl font-black text-sm hover:bg-rose-700 transition-all shadow-xl shadow-rose-200 whitespace-nowrap">
          Call 988
        </button>
      </div>
    </div>
  );
};

export default Profile;
