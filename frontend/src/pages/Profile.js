import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { UserCircleIcon, KeyIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/UI/LoadingSpinner';

export default function Profile() {
  const { user, updateProfile, changePassword } = useAuth();
  const [profileForm, setProfileForm] = useState({ full_name: '', phone: '', email: '' });
  const [pwForm, setPwForm] = useState({ current_password: '', new_password: '', confirm_password: '' });
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPw, setSavingPw] = useState(false);

  useEffect(() => {
    if (user) setProfileForm({ full_name: user.full_name || '', phone: user.phone || '', email: user.email || '' });
  }, [user]);

  const pf = (k) => ({ value: profileForm[k], onChange: e => setProfileForm(p => ({ ...p, [k]: e.target.value })) });
  const pw = (k) => ({ value: pwForm[k], onChange: e => setPwForm(p => ({ ...p, [k]: e.target.value })) });

  const saveProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      await updateProfile(profileForm);
      toast.success('Profile updated');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update profile');
    } finally { setSavingProfile(false); }
  };

  const savePw = async (e) => {
    e.preventDefault();
    if (pwForm.new_password !== pwForm.confirm_password) return toast.error('Passwords do not match');
    if (pwForm.new_password.length < 6) return toast.error('Password must be at least 6 characters');
    setSavingPw(true);
    try {
      await changePassword({ current_password: pwForm.current_password, new_password: pwForm.new_password });
      toast.success('Password changed');
      setPwForm({ current_password: '', new_password: '', confirm_password: '' });
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to change password');
    } finally { setSavingPw(false); }
  };

  return (
    <div className="space-y-6 max-w-xl">
      <h1 className="text-2xl font-bold text-slate-800">My Profile</h1>

      {/* Profile info */}
      <div className="card p-6">
        <div className="flex items-center gap-4 mb-5">
          <div className="h-14 w-14 rounded-full bg-sky-100 flex items-center justify-center">
            <UserCircleIcon className="h-9 w-9 text-sky-600" />
          </div>
          <div>
            <div className="font-bold text-slate-800 text-lg">{user?.full_name}</div>
            <div className="text-sm text-slate-600 capitalize">{user?.role}</div>
            <div className="text-sm text-slate-500">@{user?.username}</div>
          </div>
        </div>
        <form onSubmit={saveProfile} className="space-y-3">
          <div><label className="label">Full Name</label><input className="input" {...pf('full_name')} /></div>
          <div><label className="label">Email</label><input className="input" type="email" {...pf('email')} /></div>
          <div><label className="label">Phone</label><input className="input" {...pf('phone')} /></div>
          <button type="submit" disabled={savingProfile} className="btn btn-primary">
            {savingProfile ? <LoadingSpinner size="sm" /> : 'Save Changes'}
          </button>
        </form>
      </div>

      {/* Change password */}
      <div className="card p-6">
        <div className="flex items-center gap-2 mb-4">
          <KeyIcon className="h-5 w-5 text-sky-600" />
          <h2 className="font-semibold text-slate-800">Change Password</h2>
        </div>
        <form onSubmit={savePw} className="space-y-3">
          <div><label className="label">Current Password</label><input className="input" type="password" required {...pw('current_password')} /></div>
          <div><label className="label">New Password</label><input className="input" type="password" required minLength={6} {...pw('new_password')} /></div>
          <div><label className="label">Confirm New Password</label><input className="input" type="password" required {...pw('confirm_password')} /></div>
          <button type="submit" disabled={savingPw} className="btn btn-warning">
            {savingPw ? <LoadingSpinner size="sm" /> : 'Change Password'}
          </button>
        </form>
      </div>
    </div>
  );
}
