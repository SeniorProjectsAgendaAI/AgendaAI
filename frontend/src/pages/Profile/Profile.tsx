import React, { useState, useRef, useEffect } from "react";
import "./profile.css";
import { useAuthenticator } from "@aws-amplify/ui-react";
import { deleteUser, fetchUserAttributes, updateUserAttribute, updatePassword } from 'aws-amplify/auth'; 
import { useTheme } from "../../contexts/ThemeContext";
import { PROFILE_PICTURE_UPDATED_EVENT } from "../../components/ProfileButton/ProfileButton";
import api from "../../services/api";

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
    const profileImageUrlRef = useRef<string | null>(null);
    
    // Name Update States
    const [isUpdating, setIsUpdating] = useState(false);
    const [updateStatus, setUpdateStatus] = useState<{ message: string, type: 'success' | 'error' | '' }>({ message: '', type: '' });
    const [isUploadingProfileImage, setIsUploadingProfileImage] = useState(false);
    const [profileImageStatus, setProfileImageStatus] = useState<{ message: string, type: 'success' | 'error' | '' }>({ message: '', type: '' });

    // Password Update States
    const [isChangingPassword, setIsChangingPassword] = useState(false);
    const [passwordInput, setPasswordInput] = useState({ oldPassword: '', newPassword: '' });
    const [passwordStatus, setPasswordStatus] = useState<{ message: string, type: 'success' | 'error' | '' }>({ message: '', type: '' });
    const [isDeletingAccount, setIsDeletingAccount] = useState(false);
    const [deleteStatus, setDeleteStatus] = useState<{ message: string, type: 'error' | '' }>({ message: '', type: '' });

    // Sets the preview image and cleans up the old browser object URL.
    const setProfileImageObjectUrl = (imageUrl: string | null) => {
        if (profileImageUrlRef.current) {
            URL.revokeObjectURL(profileImageUrlRef.current);
        }

        profileImageUrlRef.current = imageUrl;
        setProfileImagePreview(imageUrl);
    };

    // Loads the saved profile image from the backend.
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

    useEffect(() => {
        let isMounted = true;

        const loadProfileImage = async () => {
            try {
                const response = await api.get("/users/me/profile-picture", {
                    responseType: "blob",
                });

                if (!isMounted) return;

                const imageUrl = URL.createObjectURL(response.data);
                setProfileImageObjectUrl(imageUrl);
            } catch (error: any) {
                if (error?.response?.status !== 404) {
                    console.error("Error fetching profile picture:", error);
                }
            }
        };

        loadProfileImage();

        return () => {
            isMounted = false;
        };
    }, [user]);

    useEffect(() => {
        return () => {
            if (profileImageUrlRef.current) {
                URL.revokeObjectURL(profileImageUrlRef.current);
            }
        };
    }, []);

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

    // Saves the selected PNG profile image through the backend.
    const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.type !== "image/png") {
            setProfileImageStatus({ message: "Please choose a PNG file.", type: "error" });
            e.target.value = "";
            return;
        }

        const formData = new FormData();
        formData.append("file", file);

        setIsUploadingProfileImage(true);
        setProfileImageStatus({ message: "Uploading profile picture...", type: "" });

        try {
            await api.put("/users/me/profile-picture", formData);

            const imageUrl = URL.createObjectURL(file);
            setProfileImageObjectUrl(imageUrl);
            // Refreshes the top-right profile button after the upload finishes.
            window.dispatchEvent(new Event(PROFILE_PICTURE_UPDATED_EVENT));
            setProfileImageStatus({ message: "Profile picture updated.", type: "success" });
            setTimeout(() => {
                setProfileImageStatus({ message: "", type: "" });
            }, 3000);
        } catch (error: any) {
            console.error("Failed to upload profile picture:", error);
            const detail = error?.response?.data?.detail;
            setProfileImageStatus({
                message: detail || "Failed to upload profile picture.",
                type: "error",
            });
        } finally {
            setIsUploadingProfileImage(false);
            e.target.value = "";
        }
    };

    const triggerFileInput = () => {
        fileInputRef.current?.click();
    };

    // Deletes the user's AgendaAI data and Cognito account.
    const handleDeleteAccount = async () => {
        const confirmed = window.confirm(
            "This will permanently delete your AgendaAI account, tasks, events, and connected accounts. This cannot be undone."
        );

        if (!confirmed) return;

        setIsDeletingAccount(true);
        setDeleteStatus({ message: '', type: '' });

        try {
            await api.delete("/users/me");
            await deleteUser();
        } catch (error: any) {
            console.error("Failed to delete account:", error);
            const detail = error?.response?.data?.detail;
            setDeleteStatus({
                message: detail || error?.message || "Failed to delete account. Please sign in again and try once more.",
                type: 'error',
            });
            setIsDeletingAccount(false);
            return;
        }

        try {
            await Promise.resolve(signOut());
        } catch (error) {
            console.warn("Account deleted, but sign out failed:", error);
        }
    };

    return (
        <div className="profile">
        
            <div className="profile-picture-section">
                <div className="profile-picture-wrapper" onClick={triggerFileInput}>
                    {profileImagePreview ? (
                        <img src={profileImagePreview} alt="Profile Preview" className="profile-picture" />
                    ) : (
                        <div className="profile-picture-placeholder">
                            <span>{isUploadingProfileImage ? "Uploading" : "Upload"}</span>
                        </div>
                    )}
                </div>
                {profileImageStatus.message && (
                    <span
                        className={`profile-picture-status ${profileImageStatus.type === "error" ? "error" : "success"}`}
                    >
                        {profileImageStatus.message}
                    </span>
                )}
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
                <button
                    onClick={handleDeleteAccount}
                    className="deleteAccountBtn"
                    disabled={isDeletingAccount}
                >
                    {isDeletingAccount ? "Deleting Account..." : "Delete Account"}
                </button>
                <button onClick={signOut} className="logoutBtn">
                    Logout
                </button>
                {deleteStatus.message && (
                    <span className="deleteAccountStatus">
                        {deleteStatus.message}
                    </span>
                )}
            </div>
        </div>
    );
};

export default Profile;
