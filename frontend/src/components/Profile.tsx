import React, { useState, useRef, useEffect } from "react";
import { NavLink } from "react-router-dom";
import { type User } from "../../types";
import { notificationService } from "../services/notificationService";
import { userService } from "../services/userService";
import { useApp } from "../context/AppContext";

const formatDate = (dateString?: string) => {
  if (!dateString) return "Recently joined"; // Better fallback
  try {
    const date = new Date(dateString);
    // Check if date is valid
    if (isNaN(date.getTime())) return "Recently joined";
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      year: "numeric",
    }).format(date);
  } catch (error) {
    return "Recently joined";
  }
};

const Profile: React.FC = () => {
  const { currentUser: user, updateUser: onUpdateUser, themeClasses } = useApp();

  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingProfile, setIsFetchingProfile] = useState(true);
  const [isTestingNotifs, setIsTestingNotifs] = useState(false);
  const [profileData, setProfileData] = useState<User | null>(null); // Start with null, wait for fetch
  const [editData, setEditData] = useState<Partial<User>>({
    name: "",
    email: "",
    phoneNumber: "",
  });
  const [language, setLanguage] = useState("English");
  const [notifications, setNotifications] = useState({
    email: true,
    push: notificationService.hasPermission(),
    sms: false,
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch fresh profile data from backend on mount
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setIsFetchingProfile(true);
        const freshData = await userService.getProfile();
        
        // 1. Update local state immediately for the UI
        setProfileData(freshData);
        setNotifications({
          email: freshData.notificationSettings?.email ?? true,
          push: notificationService.hasPermission(), // Browser permission is the ultimate truth for Push
          sms: freshData.notificationSettings?.sms ?? false,
        });
        setEditData({
          name: freshData.name,
          email: freshData.email,
          phoneNumber: freshData.phoneNumber || "",
          themeColor: freshData.themeColor,
        });
  
        // 2. Only sync to parent if critical data changed
        // This prevents the "WAR" between App and Profile
        const hasChanges = 
          freshData.profileImage !== user?.profileImage || 
          freshData.name !== user?.name ||
          freshData.role !== user?.role;
  
        if (hasChanges) {
          console.log("Syncing fresh data to App state...");
          onUpdateUser(freshData);
        }
      } catch (error) {
        console.error('Failed to fetch profile:', error);
        setProfileData(user);
      } finally {
        setIsFetchingProfile(false);
      }
    };
    
    fetchProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Dependency array MUST stay empty to prevent fetch loops // Empty dependency array - only run once on mount

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
  
    // Client-side check: Don't even try if it's over 5MB
    if (file.size > 5 * 1024 * 1024) {
      alert("Image is too large (max 5MB)");
      return;
    }
  
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = reader.result as string;
      try {
        setIsLoading(true);
        const updatedUser = await userService.updateProfile({
          profileImage: base64String,
        });
        setProfileData(updatedUser);
        onUpdateUser(updatedUser); 
      } catch (err: any) {
        console.error("Upload Error Details:", err);
        alert(`Upload failed: ${err.message}`); 
      } finally {
        setIsLoading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    try {
      setIsLoading(true);
      const updatedUser = await userService.updateProfile({
        name: editData.name,
        email: editData.email,
        phoneNumber: editData.phoneNumber,
        themeColor: editData.themeColor,
      });

      setProfileData(updatedUser);
      onUpdateUser(updatedUser);
      setIsEditing(false);
    } catch (error: any) {
      alert(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleNotif = async (key: keyof typeof notifications) => {
    let isGranted = notifications[key];
  
    // 1. Handle the Browser Permission Request
    if (key === "push" && !notifications.push) {
      isGranted = await notificationService.requestPermission();
      if (!isGranted) return; // User denied permission
    }
  
    const newValue = key === "push" ? isGranted : !notifications[key];
  
    // 2. Update Local State
    setNotifications((prev) => ({ ...prev, [key]: newValue }));
  
    // 3. PERSIST TO DATABASE
    try {
      await userService.updateProfile({
        notificationSettings: {
          ...notifications,
          [key]: newValue
        }
      });
    } catch (error) {
      console.error("Failed to save notification preference", error);
      // Optional: Rollback local state if API fails
    }
  };

  const testPushNotification = () => {
    setIsTestingNotifs(true);
    notificationService.showNotification("Appointment Reminder", {
      body: "You have a session with Dr. Sarah Smith in 15 minutes. Prepare your quiet space.",
      tag: "test-reminder",
    });
    setTimeout(() => setIsTestingNotifs(false), 2000);
  };

  if (isFetchingProfile || !profileData) {
    return (
      <div className="max-w-4xl mx-auto flex items-center justify-center h-96">
        <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200 overflow-hidden">
        <div className={`h-40 bg-gradient-to-r ${themeClasses.gradient} relative transition-all duration-500`}>
          <div className="absolute inset-0 opacity-10 flex items-center justify-center pointer-events-none">
            <i className="fa-solid fa-heart-pulse text-[10rem]"></i>
          </div>
        </div>
        <div className="px-10 pb-10 -mt-16 relative z-10">
          <div className="flex flex-col md:flex-row items-end gap-6 text-center md:text-left">
            <div className="relative group mx-auto md:mx-0">
              <div className={`w-32 h-32 bg-white rounded-3xl shadow-2xl border-4 border-white flex items-center justify-center text-4xl font-black ${themeClasses.text} overflow-hidden transition-colors`}>
                {profileData.profileImage ? (
                  <img
                    src={profileData.profileImage}
                    alt={profileData.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  profileData.name.charAt(0)
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
                  className={`text-3xl font-black text-slate-800 tracking-tight bg-slate-50 border border-slate-200 rounded-xl px-4 py-1 outline-none focus:ring-2 ${themeClasses.ring} w-full transition-shadow`}
                  value={editData.name}
                  onChange={(e) =>
                    setEditData({ ...editData, name: e.target.value })
                  }
                  autoFocus
                />
              ) : (
                <h2 className="text-3xl font-black text-slate-800 tracking-tight">
                  {profileData.name}
                </h2>
              )}
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 mt-2">
                <span className={`text-[10px] font-black ${themeClasses.text} ${themeClasses.secondary} px-3 py-1.5 rounded-full uppercase tracking-widest transition-colors`}>
                  {profileData.role ? profileData.role.replace("_", " ") : "USER"}
                </span>
                <span className="text-xs font-bold text-slate-400">
                  Member since {formatDate(profileData.createdAt)}
                </span>
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
                    disabled={isLoading}
                    className={`px-6 py-2.5 ${themeClasses.primary} ${themeClasses.hover} text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg ${themeClasses.shadow}`}
                  >
                    {isLoading ? "Saving..." : "Save Changes"}
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
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">
                Personal Information
              </h3>
              <div className="grid grid-cols-1 gap-6">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Email Address
                  </label>
                  
                    <p className="text-sm font-bold text-slate-800">
                      {profileData.email}
                    </p>
                  
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Phone Number
                  </label>
                  {isEditing ? (
                    <input
                      className={`w-full mt-1 p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-2 ${themeClasses.ring} transition-shadow`}
                      value={editData.phoneNumber}
                      onChange={(e) =>
                        setEditData({
                          ...editData,
                          phoneNumber: e.target.value,
                        })
                      }
                    />
                  ) : (
                    <p className="text-sm font-bold text-slate-800">
                      {profileData.phoneNumber || "Not provided"}
                    </p>
                  )}
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Preferred Language
                  </label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className={`w-full mt-1 p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-2 ${themeClasses.ring} transition-all cursor-pointer`}
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
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">
                  Notification Preferences
                </h3>
                {notifications.push && (
                  <button
                    onClick={testPushNotification}
                    disabled={isTestingNotifs}
                    className={`text-[10px] font-black ${themeClasses.text} uppercase tracking-widest hover:underline disabled:opacity-50 transition-colors`}
                  >
                    {isTestingNotifs ? "Testing..." : "Test Push Notification"}
                  </button>
                )}
              </div>
              <div className="space-y-4">
                {[
                  {
                    id: "email",
                    label: "Email Reminders",
                    desc: "Receive assignment alerts via email",
                  },
                  {
                    id: "push",
                    label: "Push Notifications",
                    desc: "Real-time alerts for appointments and deadlines",
                  },
                  {
                    id: "sms",
                    label: "SMS Alerts",
                    desc: "Important clinical check-ins via text message",
                    disabled: true,
                  },
                ].map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between"
                  >
                    <div>
                      <p className="text-sm font-bold text-slate-700">
                        {item.label}
                      </p>
                      <p className="text-[10px] text-slate-400 font-medium">
                        {item.desc}
                      </p>
                    </div>
                    <button
                      onClick={() =>
                        !item.disabled && toggleNotif(item.id as any)
                      }
                      disabled={item.disabled}
                      className={`w-12 h-6 rounded-full relative transition-all ${
                        notifications[item.id as keyof typeof notifications]
                          ? themeClasses.primary
                          : "bg-slate-200"
                      } ${
                        item.disabled ? "opacity-30 cursor-not-allowed" : ""
                      }`}
                    >
                      <div
                        className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${
                          notifications[item.id as keyof typeof notifications]
                            ? "right-1"
                            : "left-1"
                        }`}
                      ></div>
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

            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest pt-6 border-t border-slate-50">
              Clinic Affiliation
            </h3>
            <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-4">
              <div className={`w-12 h-12 bg-white rounded-xl flex items-center justify-center text-xl ${themeClasses.text} shadow-sm border border-slate-100 transition-colors`}>
                <i className="fa-solid fa-hospital"></i>
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800">
                  Central Wellness Clinic
                </p>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                  Clinic ID: {profileData.clinicId || "Not connected"}
                </p>
              </div>
              <NavLink
                to="/session"
                className={`ml-auto ${themeClasses.text} font-black text-[10px] uppercase tracking-widest hover:underline transition-colors`}
              >
                Connect
              </NavLink>
            </div>

            <div className="bg-emerald-50 p-6 rounded-2xl border border-emerald-100">
              <div className="flex items-center gap-3 text-emerald-700 font-bold text-sm mb-2">
                <i className="fa-solid fa-check-double"></i>
                HIPAA Verified Account
              </div>
              <p className="text-[10px] text-emerald-600 leading-relaxed font-medium">
                Your identity was verified via ID.me on {formatDate(profileData.createdAt)}. Compliance
                status: Active.
              </p>
            </div>
          </section>
        </div>
      </div>

      <div className="bg-rose-50 border border-rose-100 p-8 rounded-[2rem] flex flex-col md:flex-row gap-6 items-center">
        <div className="w-16 h-16 bg-rose-600 text-white rounded-[1.5rem] flex items-center justify-center text-2xl shadow-lg shadow-rose-100">
          <i className="fa-solid fa-phone-flip"></i>
        </div>
        <div className="flex-1 text-center md:text-left">
          <h3 className="text-xl font-bold text-rose-900 mb-1">
            Crisis Support Network
          </h3>
          <p className="text-sm text-rose-700 leading-relaxed opacity-80 font-medium">
            Immediate, free support is available 24/7. You don't have to carry
            this alone.
          </p>
        </div>
        <button className="px-8 py-3.5 bg-rose-600 text-white rounded-2xl font-black text-sm hover:bg-rose-700 transition-all shadow-xl shadow-rose-200 whitespace-nowrap">
          Call 988
        </button>
      </div>
    </div>
  );
};

export default Profile;