import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { 
  User as UserIcon, 
  Mail, 
  Phone, 
  FileText, 
  Shield, 
  Calendar, 
  Edit3, 
  Save, 
  X, 
  ArrowUpRight, 
  CheckCircle,
  Loader,
  AlertTriangle
} from 'lucide-react';

export const ProfilePage: React.FC = () => {
  const { user, updateProfile } = useAuth();
  const navigate = useNavigate();

  // Edit form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [bio, setBio] = useState('');

  // Status states
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Synchronize state with current user info
  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setEmail(user.email || '');
      setPhoneNumber(user.phoneNumber || '');
      setBio(user.bio || '');
    }
  }, [user]);

  if (!user) {
    return (
      <div className="min-h-screen bg-background pt-32 pb-20 flex items-center justify-center p-6 text-center relative overflow-hidden">
        <div className="bg-mesh"></div>
        <div className="floating-orb" style={{ top: '20%', left: '10%' }}></div>
        <div className="max-w-md glass-panel p-8 rounded-2xl relative z-10 animate-fade-in-scale">
          <AlertTriangle size={48} className="text-primary mx-auto mb-4 animate-bounce" />
          <h2 className="font-headline text-2xl font-bold text-white mb-2">Hồ Sơ Cá Nhân</h2>
          <p className="text-sm text-on-surface-variant/75 mb-6">
            Vui lòng đăng nhập tài khoản của bạn để truy cập và chỉnh sửa hồ sơ cá nhân.
          </p>
          <button 
            onClick={() => {
              // Scroll to top and click the login button in Header
              window.scrollTo({ top: 0, behavior: 'smooth' });
              // Simple trigger: dispatch a custom event to notify Header
              window.dispatchEvent(new CustomEvent('trigger-login-modal'));
            }}
            className="w-full bg-primary hover:bg-primary/90 text-white font-headline font-semibold py-3 px-6 rounded-xl transition duration-300 crimson-glow"
          >
            Đăng Nhập Ngay
          </button>
        </div>
      </div>
    );
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setSuccessMsg('');
    setErrorMsg('');

    try {
      await updateProfile({ name, email, phoneNumber, bio });
      setSuccessMsg('Cập nhật hồ sơ cá nhân thành công!');
      setIsEditing(false);
    } catch (err: any) {
      setErrorMsg(err.message || 'Có lỗi xảy ra khi cập nhật hồ sơ.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setName(user.name || '');
    setEmail(user.email || '');
    setPhoneNumber(user.phoneNumber || '');
    setBio(user.bio || '');
    setIsEditing(false);
    setSuccessMsg('');
    setErrorMsg('');
  };

  // Format expiration date if it exists
  const formatExpiry = (dateString?: string) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch (e) {
      return dateString;
    }
  };

  const getPlanBadgeStyles = (plan?: string) => {
    switch (plan) {
      case 'VIP':
        return 'bg-gradient-to-r from-yellow-500 to-amber-600 text-white border-yellow-400';
      case 'Standard':
        return 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white border-blue-400';
      default:
        return 'bg-zinc-800 text-zinc-400 border-zinc-700';
    }
  };

  return (
    <div className="min-h-screen bg-background pt-32 pb-20 px-4 md:px-8 relative overflow-hidden">
      <div className="bg-mesh"></div>
      <div className="floating-orb" style={{ top: '15%', left: '5%' }}></div>
      <div className="floating-orb" style={{ bottom: '15%', right: '5%' }}></div>

      <div className="max-w-5xl mx-auto relative z-10 animate-fade-in-scale">
        <h1 className="font-headline text-4xl md:text-5xl font-black mb-8 tracking-tight bg-gradient-to-r from-white via-on-surface to-zinc-500 bg-clip-text text-transparent">
          Thông Tin Tài Khoản
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column: User Summary Card & Subscription Card */}
          <div className="lg:col-span-1 space-y-6">
            
            {/* User Info Card */}
            <div className="glass-panel p-6 rounded-2xl border border-white/5 flex flex-col items-center text-center">
              <div className="relative mb-4">
                <div className="w-24 h-24 rounded-full overflow-hidden ring-4 ring-primary/40 flex items-center justify-center bg-zinc-800">
                  {user.avatar ? (
                    <img src={user.avatar} alt={user.name || user.username} className="w-full h-full object-cover" />
                  ) : (
                    <UserIcon size={48} className="text-zinc-500" />
                  )}
                </div>
                {user.subscription?.plan !== 'Free' && (
                  <span className={`absolute -bottom-1 -right-1 text-xs px-2.5 py-0.5 rounded-full font-headline font-bold border shadow-md uppercase tracking-wider ${getPlanBadgeStyles(user.subscription?.plan)}`}>
                    {user.subscription?.plan}
                  </span>
                )}
              </div>
              <h2 className="text-xl font-headline font-bold text-white leading-tight">
                {user.name || user.username}
              </h2>
              <p className="text-sm text-zinc-400 mt-1">@{user.username}</p>
              {user.bio && (
                <p className="text-xs text-zinc-300 italic mt-3 bg-white/5 py-2 px-3 rounded-lg w-full line-clamp-3">
                  "{user.bio}"
                </p>
              )}
            </div>

            {/* Premium Subscription Card */}
            <div className="glass-panel p-6 rounded-2xl border border-white/5 relative overflow-hidden group">
              {/* Premium Card Glow Background */}
              <div className={`absolute inset-0 bg-gradient-to-br transition-opacity duration-500 opacity-10 group-hover:opacity-15 -z-10 ${
                user.subscription?.plan === 'VIP' ? 'from-amber-500 to-yellow-600' :
                user.subscription?.plan === 'Standard' ? 'from-blue-500 to-indigo-600' :
                'from-primary to-rose-600'
              }`}></div>
              
              <h3 className="font-headline font-bold text-lg text-white mb-4 flex items-center gap-2">
                <Shield size={20} className="text-primary" />
                Cấp Độ Thành Viên
              </h3>

              {user.subscription?.plan !== 'Free' && user.subscription?.status === 'active' ? (
                <div className="space-y-4">
                  <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                    <p className="text-xs text-zinc-400">Gói hiện tại</p>
                    <h4 className="text-2xl font-headline font-extrabold text-white mt-1 flex items-baseline gap-2">
                      <span className={user.subscription.plan === 'VIP' ? 'text-amber-400' : 'text-blue-400'}>
                        {user.subscription.plan}
                      </span>
                      <span className="text-xs font-normal text-emerald-400 px-2 py-0.5 bg-emerald-500/10 rounded-full border border-emerald-500/20">
                        Đang hoạt động
                      </span>
                    </h4>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-zinc-300">
                    <Calendar size={16} className="text-primary/75" />
                    <span>Hạn sử dụng: <strong>{formatExpiry(user.subscription.expiresAt)}</strong></span>
                  </div>

                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Hệ thống sẽ tự động cập nhật lại gói thành viên miễn phí khi hết thời gian trải nghiệm 30 ngày.
                  </p>

                  <button 
                    onClick={() => navigate('/premium')}
                    className="w-full bg-white/10 hover:bg-white/15 text-white text-sm font-headline font-semibold py-2.5 px-4 rounded-xl border border-white/10 hover:border-white/20 transition duration-300 flex items-center justify-center gap-2"
                  >
                    Thay Đổi Gói Cước
                    <ArrowUpRight size={16} />
                  </button>
                </div>
              ) : (
                <div className="space-y-4 animate-pulse">
                  <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                    <p className="text-xs text-zinc-400">Gói hiện tại</p>
                    <h4 className="text-2xl font-headline font-extrabold text-zinc-500 mt-1">
                      FREE (Miễn Phí)
                    </h4>
                  </div>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Bạn đang ở gói miễn phí. Hãy nâng cấp Standard hoặc VIP để không bị gián đoạn quảng cáo, xem phim với độ phân giải lên tới 4K và truy cập kho phim đặc sắc độc quyền.
                  </p>
                  <button 
                    onClick={() => navigate('/premium')}
                    className="w-full bg-primary hover:bg-primary/95 text-white font-headline font-semibold py-3 px-4 rounded-xl transition duration-300 flex items-center justify-center gap-2 crimson-glow"
                  >
                    Nâng Cấp Premium Ngay
                    <ArrowUpRight size={18} />
                  </button>
                </div>
              )}
            </div>

          </div>

          {/* Right Column: Editable Profile Settings Form */}
          <div className="lg:col-span-2">
            <div className="glass-panel p-6 md:p-8 rounded-2xl border border-white/5">
              
              <div className="flex justify-between items-center mb-6 pb-4 border-b border-white/5">
                <h3 className="font-headline font-bold text-xl text-white">
                  Thông Tin Cá Nhân
                </h3>
                {!isEditing && (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="flex items-center gap-1.5 text-sm font-semibold text-primary hover:text-primary/80 transition"
                  >
                    <Edit3 size={16} />
                    Chỉnh sửa
                  </button>
                )}
              </div>

              {/* Toast messages */}
              {successMsg && (
                <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm flex items-center gap-2">
                  <CheckCircle size={18} className="shrink-0" />
                  <span>{successMsg}</span>
                </div>
              )}

              {errorMsg && (
                <div className="mb-6 p-4 rounded-xl bg-primary/10 border border-primary/20 text-primary text-sm flex items-center gap-2">
                  <AlertTriangle size={18} className="shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <form onSubmit={handleSave} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Full Name */}
                  <div className="space-y-2">
                    <label htmlFor="name" className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block">
                      Họ và Tên
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500">
                        <UserIcon size={18} />
                      </div>
                      <input
                        type="text"
                        id="name"
                        disabled={!isEditing}
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Nhập họ và tên..."
                        className={`w-full pl-10 pr-4 py-3 rounded-xl border transition-all duration-300 font-sans text-sm focus:outline-none ${
                          isEditing
                            ? 'bg-zinc-900 border-white/10 text-white focus:border-primary focus:ring-1 focus:ring-primary'
                            : 'bg-zinc-950 border-white/5 text-zinc-400 cursor-not-allowed'
                        }`}
                      />
                    </div>
                  </div>

                  {/* Email */}
                  <div className="space-y-2">
                    <label htmlFor="email" className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block">
                      Địa Chỉ Email
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500">
                        <Mail size={18} />
                      </div>
                      <input
                        type="email"
                        id="email"
                        disabled={!isEditing}
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="vi-du@email.com"
                        className={`w-full pl-10 pr-4 py-3 rounded-xl border transition-all duration-300 font-sans text-sm focus:outline-none ${
                          isEditing
                            ? 'bg-zinc-900 border-white/10 text-white focus:border-primary focus:ring-1 focus:ring-primary'
                            : 'bg-zinc-950 border-white/5 text-zinc-400 cursor-not-allowed'
                        }`}
                      />
                    </div>
                  </div>

                  {/* Phone Number */}
                  <div className="space-y-2">
                    <label htmlFor="phoneNumber" className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block">
                      Số Điện Thoại
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500">
                        <Phone size={18} />
                      </div>
                      <input
                        type="tel"
                        id="phoneNumber"
                        disabled={!isEditing}
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        placeholder="Số điện thoại liên hệ..."
                        className={`w-full pl-10 pr-4 py-3 rounded-xl border transition-all duration-300 font-sans text-sm focus:outline-none ${
                          isEditing
                            ? 'bg-zinc-900 border-white/10 text-white focus:border-primary focus:ring-1 focus:ring-primary'
                            : 'bg-zinc-950 border-white/5 text-zinc-400 cursor-not-allowed'
                        }`}
                      />
                    </div>
                  </div>

                  {/* Username (Not Editable) */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block">
                      Tên Đăng Nhập
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500">
                        <UserIcon size={18} />
                      </div>
                      <input
                        type="text"
                        disabled
                        value={user.username}
                        className="w-full pl-10 pr-4 py-3 rounded-xl border bg-zinc-950/70 border-white/5 text-zinc-500 cursor-not-allowed font-sans text-sm"
                      />
                    </div>
                  </div>

                </div>

                {/* Biography */}
                <div className="space-y-2">
                  <label htmlFor="bio" className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block">
                    Tiểu Sử / Giới Thiệu Ngắn
                  </label>
                  <div className="relative">
                    <div className="absolute top-3 left-3.5 flex items-start pointer-events-none text-zinc-500">
                      <FileText size={18} />
                    </div>
                    <textarea
                      id="bio"
                      disabled={!isEditing}
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      placeholder="Mô tả một vài điều về bạn..."
                      rows={4}
                      className={`w-full pl-10 pr-4 py-3 rounded-xl border transition-all duration-300 font-sans text-sm focus:outline-none resize-none ${
                        isEditing
                          ? 'bg-zinc-900 border-white/10 text-white focus:border-primary focus:ring-1 focus:ring-primary'
                          : 'bg-zinc-950 border-white/5 text-zinc-400 cursor-not-allowed'
                      }`}
                    />
                  </div>
                </div>

                {/* Form Buttons */}
                {isEditing && (
                  <div className="flex justify-end items-center gap-4 pt-4 border-t border-white/5 animate-fade-in-scale">
                    <button
                      type="button"
                      onClick={handleCancel}
                      disabled={isLoading}
                      className="px-5 py-2.5 rounded-xl border border-white/10 hover:bg-white/5 text-sm font-semibold transition flex items-center gap-1.5"
                    >
                      <X size={16} />
                      Hủy bỏ
                    </button>
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="px-6 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-white text-sm font-semibold transition flex items-center gap-1.5 crimson-glow"
                    >
                      {isLoading ? (
                        <Loader size={16} className="animate-spin" />
                      ) : (
                        <Save size={16} />
                      )}
                      Lưu thay đổi
                    </button>
                  </div>
                )}
              </form>

            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
