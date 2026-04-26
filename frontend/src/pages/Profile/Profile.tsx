import React, { useState, useRef, useEffect } from "react";
import "./profile.css";
import { useAuthenticator } from "@aws-amplify/ui-react";
import { fetchUserAttributes, updateUserAttribute, updatePassword } from 'aws-amplify/auth'; 
import { useTheme } from "../../contexts/ThemeContext";

interface ProfileData {
    fullName?: string;
    email?: string;
    // Removed the dummy password state completely
}

const Profile: React.FC = () => {
    const { signOut, user } = useAuthenticator();
    const { theme, toggleTheme } = useTheme();

    const [profileData, setProfileData] = useState<ProfileData>({
        fullName: "",
        email: "",
    });

    const [profileImagePreview, setProfileImagePreview] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    // Name Update States
    const [isUpdating, setIsUpdating] = useState(false);
    const [updateStatus, setUpdateStatus] = useState<{ message: string, type: 'success' | 'error' | '' }>({ message: '', type: '' });

    // Password Update States
    const [isChangingPassword, setIsChangingPassword] = useState(false);
    const [passwordInput, setPasswordInput] = useState({ oldPassword: '', newPassword: '' });
    const [passwordStatus, setPasswordStatus] = useState<{ message: string, type: 'success' | 'error' | '' }>({ message: '', type: '' });

    useEffect(() => {
        const loadUserData = async () => {
            try {
                const attributes = await fetchUserAttributes();
                
                setProfileData({
                    fullName: attributes.name || "", 
                    email: attributes.email || user?.signInDetails?.loginId || "",
                });
            } catch (error) {
                console.error("Error fetching user attributes:", error);
            }
        };

        loadUserData();
    }, [user]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setProfileData((prev) => ({
            ...prev,
            [name]: value
        }));
    };

    const saveProfileChanges = async () => {
        if (!profileData.fullName || profileData.fullName.trim() === "") return;
        
        setIsUpdating(true);
        setUpdateStatus({ message: 'Saving...', type: '' });

        try {
            await updateUserAttribute({
                userAttribute: {
                    attributeKey: 'name',
                    value: profileData.fullName.trim()
                }
            });
            
            setUpdateStatus({ message: 'Name updated successfully!', type: 'success' });
            
            setTimeout(() => {
                setUpdateStatus({ message: '', type: '' });
            }, 3000);
            
        } catch (error) {
            console.error("Failed to update name:", error);
            setUpdateStatus({ message: 'Failed to update name. Try again.', type: 'error' });
        } finally {
            setIsUpdating(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault(); 
            saveProfileChanges();
        }
    };

    const handlePasswordSubmit = async () => {
        if (!passwordInput.oldPassword || !passwordInput.newPassword) {
            setPasswordStatus({ message: 'Both fields are required', type: 'error' });
            return;
        }

        try {
            setPasswordStatus({ message: 'Updating password...', type: '' });
            await updatePassword({
                oldPassword: passwordInput.oldPassword,
                newPassword: passwordInput.newPassword
            });
            
            setPasswordStatus({ message: 'Password updated successfully!', type: 'success' });
            
            setTimeout(() => {
                setIsChangingPassword(false);
                setPasswordInput({ oldPassword: '', newPassword: '' });
                setPasswordStatus({ message: '', type: '' });
            }, 3000);

        } catch (error: any) {
            console.error("Failed to update password:", error);
            setPasswordStatus({ message: error.message || 'Failed to update password.', type: 'error' });
        }
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const imageUrl = URL.createObjectURL(file);
            setProfileImagePreview(imageUrl);
            
            
        }
    };

    const triggerFileInput = () => {
        fileInputRef.current?.click();
    };

    return (
        <div className="profile">
        
            <div className="profile-picture-section">
                <div className="profile-picture-wrapper" onClick={triggerFileInput}>
                    {profileImagePreview ? (
                        <img src={profileImagePreview} alt="Profile Preview" className="profile-picture" />
                    ) : (
                        <div className="profile-picture-placeholder">
                            <span>Upload</span>
                        </div>
                    )}
                </div>
                <input
                    type="file"
                    accept="image/png"
                    ref={fileInputRef}
                    onChange={handleImageChange}
                    style={{ display: "none" }}
                />
            </div>
            
            <p className="profile-greeting">
                Hi, {profileData.fullName || profileData.email}
            </p>

            <div className="profile-form">
                <div className="form-group">
                    <label>Name</label>
                    <input
                        type="text"
                        name="fullName"
                        value={profileData.fullName}
                        onChange={handleInputChange}
                        onKeyDown={handleKeyDown} 
                        disabled={isUpdating} 
                    />
                    {updateStatus.message && (
                        <span style={{ 
                            fontSize: '12px', 
                            marginTop: '4px',
                            color: updateStatus.type === 'error' ? '#f44336' : '#4caf50' 
                        }}>
                            {updateStatus.message}
                        </span>
                    )}
                </div>
                
                <div className="form-group">
                    <label>Email</label>
                    <input
                        type="email"
                        name="email"
                        value={profileData.email}
                        onChange={handleInputChange}
                        disabled 
                    />
                </div>
                
                {/* password */}
                <div className="form-group password-group">
                    <label>Password</label>
                    
                    {!isChangingPassword ? (
                        <button
                            type="button"
                            onClick={() => setIsChangingPassword(true)}
                            style={{
                                padding: '10px 16px',
                                background: 'transparent',
                                border: '1px solid var(--border-color)',
                                color: 'var(--text-color)',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontWeight: '500',
                                alignSelf: 'flex-start',
                                width: 'fit-content'
                            }}
                        >
                            Change Password
                        </button>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <input
                                type="password"
                                placeholder="Current Password"
                                value={passwordInput.oldPassword}
                                onChange={(e) => setPasswordInput({...passwordInput, oldPassword: e.target.value})}
                            />
                            <input
                                type="password"
                                placeholder="New Password"
                                value={passwordInput.newPassword}
                                onChange={(e) => setPasswordInput({...passwordInput, newPassword: e.target.value})}
                            />
                            <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                                <button 
                                    onClick={handlePasswordSubmit} 
                                    style={{ padding: '6px 12px', background: '#4caf50', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                                >
                                    Save Password
                                </button>
                                <button 
                                    onClick={() => {
                                        setIsChangingPassword(false);
                                        setPasswordStatus({ message: '', type: '' });
                                    }} 
                                    style={{ padding: '6px 12px', background: '#f44336', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                                >
                                    Cancel
                                </button>
                            </div>
                            {passwordStatus.message && (
                                <span style={{ 
                                    fontSize: '12px', 
                                    color: passwordStatus.type === 'error' ? '#f44336' : '#4caf50' 
                                }}>
                                    {passwordStatus.message}
                                </span>
                            )}
                        </div>
                    )}
                </div>
            </div>

            <div className="action-buttons">
                <button
                    onClick={toggleTheme}
                    className="themeToggleBtn">
                    Switch to {theme === "light" ? "Dark" : "Light"} Mode
                </button>
                <button onClick={signOut} className="logoutBtn">
                    Delete Account
                </button>
                <button onClick={signOut} className="logoutBtn">
                    Logout
                </button>
            </div>
        </div>
    );
};

export default Profile;