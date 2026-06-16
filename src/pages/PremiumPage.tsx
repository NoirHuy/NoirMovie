import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { 
  Check, 
  ShieldCheck, 
  Sparkles, 
  Crown, 
  CreditCard, 
  X, 
  Loader, 
  Smartphone, 
  ArrowLeft, 
  AlertTriangle,
  ArrowRight
} from 'lucide-react';

interface PricingPlan {
  id: 'Free' | 'Standard' | 'VIP';
  name: string;
  price: string;
  priceNumber: number;
  period: string;
  description: string;
  features: string[];
  color: string;
  badgeColor: string;
  accentColor: string;
  gradient: string;
  icon: React.ReactNode;
}

export const PremiumPage: React.FC = () => {
  const { user, subscribePlan } = useAuth();
  const navigate = useNavigate();

  const [selectedPlan, setSelectedPlan] = useState<PricingPlan | null>(null);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'success' | 'failed'>('idle');
  const [progress, setProgress] = useState(0);

  // Plans config
  const plans: PricingPlan[] = [
    {
      id: 'Free',
      name: 'Gói Miễn Phí (Free)',
      price: '0đ',
      priceNumber: 0,
      period: 'trọn đời',
      description: 'Trải nghiệm xem phim cơ bản với quảng cáo.',
      features: [
        'Độ phân giải SD (480p/720p)',
        'Có chứa quảng cáo khi xem phim',
        'Xem trên 1 thiết bị đồng thời',
        'Không hỗ trợ các bộ phim nhãn Premium/VIP'
      ],
      color: 'border-zinc-800 bg-zinc-950/40 text-zinc-400',
      badgeColor: 'bg-zinc-800 text-zinc-400 border-zinc-700',
      accentColor: 'text-zinc-400',
      gradient: 'from-zinc-950 to-zinc-900',
      icon: <CreditCard className="text-zinc-500" size={24} />
    },
    {
      id: 'Standard',
      name: 'Thành Viên Tiêu Chuẩn (Standard)',
      price: '79.000đ',
      priceNumber: 79000,
      period: '30 ngày',
      description: 'Độ phân giải cao, không quảng cáo, truy cập phim Premium.',
      features: [
        'Độ phân giải Full HD (1080p) sắc nét',
        'Hoàn toàn không có quảng cáo',
        'Xem trên tối đa 2 thiết bị cùng lúc',
        'Mở khóa toàn bộ phim Premium gắn nhãn đỏ',
        'Hỗ trợ âm thanh vòm Dolby Digital 5.1'
      ],
      color: 'border-blue-500/30 bg-blue-950/10 text-zinc-300 ring-1 ring-blue-500/20',
      badgeColor: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
      accentColor: 'text-blue-400',
      gradient: 'from-zinc-950 via-zinc-900 to-blue-950/20',
      icon: <Sparkles className="text-blue-400" size={24} />
    },
    {
      id: 'VIP',
      name: 'Thành Viên Cao Cấp (VIP)',
      price: '149.000đ',
      priceNumber: 149000,
      period: '30 ngày',
      description: 'Trải nghiệm đỉnh cao nhất với chất lượng 4K HDR và đặc quyền VIP.',
      features: [
        'Độ phân giải 4K Ultra HD & HDR đỉnh cao',
        'Hoàn toàn không có quảng cáo',
        'Xem trên tối đa 4 thiết bị cùng lúc',
        'Mở khóa tất cả phim Premium và phim VIP độc quyền',
        'Hỗ trợ âm thanh Dolby Atmos cao cấp nhất',
        'Ưu tiên xem trước các tập phim mới phát sóng'
      ],
      color: 'border-amber-500/60 bg-amber-950/15 text-zinc-100 ring-2 ring-amber-500/40 shadow-[0_0_30px_rgba(245,158,11,0.15)]',
      badgeColor: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
      accentColor: 'text-amber-400',
      gradient: 'from-zinc-950 via-zinc-900 to-amber-950/25',
      icon: <Crown className="text-amber-400 font-bold" size={26} />
    }
  ];

  const currentPlanId = user?.subscription?.plan || 'Free';

  // Handles plan selection
  const handleSelectPlan = (plan: PricingPlan) => {
    if (!user) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      window.dispatchEvent(new CustomEvent('trigger-login-modal'));
      return;
    }

    if (plan.id === currentPlanId) {
      return; // Already on this plan
    }

    setSelectedPlan(plan);
    setPaymentStatus('idle');
    setProgress(0);
    setIsQrModalOpen(true);
  };

  // Simulated Payment Verification loop
  useEffect(() => {
    let timer: any;
    if (isQrModalOpen && paymentStatus === 'processing') {
      const interval = 50; //ms
      const duration = 2500; //ms
      const step = 100 / (duration / interval);

      timer = setInterval(() => {
        setProgress(prev => {
          if (prev >= 100) {
            clearInterval(timer);
            // Submit subscription to backend
            handleConfirmPayment();
            return 100;
          }
          return prev + step;
        });
      }, interval);
    }
    return () => clearInterval(timer);
  }, [paymentStatus, isQrModalOpen]);

  const handleStartSimulatedPayment = () => {
    setPaymentStatus('processing');
    setProgress(0);
  };

  const handleConfirmPayment = async () => {
    if (!selectedPlan) return;
    try {
      await subscribePlan(selectedPlan.id);
      setPaymentStatus('success');
    } catch (e) {
      console.error(e);
      setPaymentStatus('failed');
    }
  };

  const getTransferContent = () => {
    if (!user || !selectedPlan) return '';
    return `NOIRMOVIE ${selectedPlan.id.toUpperCase()} ${user.username.toUpperCase()}`;
  };

  // Simulated VietQR Image URL
  const getQrImageUrl = () => {
    if (!selectedPlan) return '';
    const content = encodeURIComponent(getTransferContent());
    // Using VietQR compact template with MB Bank account
    return `https://img.vietqr.io/image/mbbank-8888866669999-compact2.png?amount=${selectedPlan.priceNumber}&addInfo=${content}&accountName=CONG%20TY%20NOIR%20MOVIE%20VIETNAM`;
  };

  return (
    <div className="min-h-screen bg-background pt-32 pb-20 px-4 md:px-8 relative overflow-hidden">
      <div className="bg-mesh"></div>
      <div className="floating-orb" style={{ top: '10%', right: '10%' }}></div>
      <div className="floating-orb" style={{ bottom: '20%', left: '10%' }}></div>

      <div className="max-w-6xl mx-auto relative z-10">
        
        {/* Header Section */}
        <div className="text-center max-w-2xl mx-auto mb-16 animate-fade-in-scale">
          <button 
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1 text-sm text-zinc-400 hover:text-white mb-6 transition group"
          >
            <ArrowLeft size={16} className="transform group-hover:-translate-x-1 transition-transform" />
            Quay lại trang trước
          </button>
          
          <h1 className="font-headline text-4xl md:text-6xl font-black mb-4 tracking-tight leading-none">
            Nâng Cấp Trải Nghiệm <span className="bg-gradient-to-r from-primary via-rose-500 to-amber-500 bg-clip-text text-transparent">NoirMovie Premium</span>
          </h1>
          <p className="text-sm md:text-base text-zinc-400">
            Chọn gói cước phù hợp nhất với phong cách xem phim của bạn. Mở khóa thế giới điện ảnh đỉnh cao chất lượng 4K không giới hạn.
          </p>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch max-w-5xl mx-auto">
          {plans.map((plan, idx) => {
            const isCurrent = plan.id === currentPlanId;
            const isVip = plan.id === 'VIP';
            
            return (
              <div 
                key={plan.id}
                style={{ animationDelay: `${idx * 150}ms` }}
                className={`glass-panel rounded-3xl p-8 border flex flex-col justify-between transition-all duration-500 relative overflow-hidden group hover:scale-[1.03] hover:shadow-2xl hover:z-20 ${plan.color} ${
                  isVip ? 'animate-pulse-slow' : 'animate-fade-in-scale'
                }`}
              >
                {/* Background gradient subtle overlay */}
                <div className={`absolute inset-0 bg-gradient-to-b opacity-5 group-hover:opacity-10 transition-opacity duration-300 ${plan.gradient}`}></div>
                
                {/* VIP Special Badge */}
                {isVip && (
                  <div className="absolute top-0 right-0 bg-gradient-to-l from-amber-500 to-yellow-500 text-black font-headline font-extrabold text-[10px] uppercase tracking-wider py-1 px-4 rounded-bl-xl border-l border-b border-amber-400 flex items-center gap-1 shadow-lg">
                    <Crown size={10} />
                    Khuyên Dùng
                  </div>
                )}

                <div className="relative z-10">
                  {/* Plan Name & Icon */}
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <span className={`text-[10px] font-headline font-bold uppercase tracking-wider border rounded-full px-2.5 py-0.5 ${plan.badgeColor}`}>
                        {plan.id}
                      </span>
                      <h3 className="text-xl font-headline font-bold text-white mt-2 leading-snug">
                        {plan.name}
                      </h3>
                    </div>
                    <div className="p-3 bg-white/5 rounded-2xl border border-white/5 group-hover:scale-110 transition duration-300">
                      {plan.icon}
                    </div>
                  </div>

                  <p className="text-xs text-zinc-400 mb-6 min-h-[40px]">
                    {plan.description}
                  </p>

                  {/* Price */}
                  <div className="mb-6 flex items-baseline gap-1">
                    <span className="text-4xl font-headline font-black text-white">
                      {plan.price}
                    </span>
                    <span className="text-zinc-500 text-xs font-semibold">
                      / {plan.period}
                    </span>
                  </div>

                  {/* Features List */}
                  <ul className="space-y-3 pb-8 border-t border-white/5 pt-6">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-xs text-zinc-300">
                        <Check className={`shrink-0 mt-0.5 ${plan.accentColor}`} size={14} />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="relative z-10 mt-auto">
                  {isCurrent ? (
                    <button 
                      disabled
                      className="w-full bg-zinc-800 text-zinc-500 border border-zinc-700 cursor-not-allowed font-headline font-bold py-3.5 px-6 rounded-2xl flex items-center justify-center gap-2"
                    >
                      <ShieldCheck size={18} />
                      Gói Hiện Tại
                    </button>
                  ) : (
                    <button 
                      onClick={() => handleSelectPlan(plan)}
                      className={`w-full font-headline font-extrabold py-3.5 px-6 rounded-2xl transition duration-300 cursor-pointer flex items-center justify-center gap-1.5 shadow-md ${
                        plan.id === 'VIP' 
                          ? 'bg-gradient-to-r from-amber-500 to-yellow-600 text-black hover:brightness-110 shadow-amber-500/10' 
                          : plan.id === 'Standard'
                          ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:brightness-110 shadow-blue-500/10'
                          : 'bg-white/10 hover:bg-white/15 text-white border border-white/10'
                      }`}
                    >
                      Chọn {plan.name.split(' (')[0]}
                      <ArrowRight size={16} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Support note */}
        <div className="text-center mt-16 max-w-xl mx-auto glass-panel p-4 rounded-xl border border-white/5 text-xs text-zinc-400">
          * Đây là hệ thống thanh toán **giả lập**. Hệ thống KHÔNG trừ tiền thực tế trên thẻ hay tài khoản của bạn. Vui lòng quét mã QR giả lập để trải nghiệm quy trình nâng cấp Premium của chúng tôi.
        </div>

      </div>

      {/* QR Code Glassmorphic Payment Modal */}
      {isQrModalOpen && selectedPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="glass-panel w-full max-w-lg rounded-3xl p-6 md:p-8 border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.8)] relative max-h-[90vh] overflow-y-auto custom-scrollbar">
            
            {/* Close Button */}
            <button 
              onClick={() => {
                if (paymentStatus !== 'processing') {
                  setIsQrModalOpen(false);
                }
              }}
              disabled={paymentStatus === 'processing'}
              className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-full transition disabled:opacity-50"
            >
              <X size={18} />
            </button>

            {/* Modal Content - Idle/Processing State */}
            {(paymentStatus === 'idle' || paymentStatus === 'processing') && (
              <div className="text-center">
                <span className={`inline-flex items-center gap-1 text-[10px] font-headline font-bold uppercase tracking-wider border rounded-full px-2.5 py-0.5 mb-4 ${selectedPlan.badgeColor}`}>
                  {selectedPlan.id}
                </span>
                
                <h3 className="text-xl md:text-2xl font-headline font-black text-white leading-tight">
                  Quét Mã QR Thanh Toán
                </h3>
                <p className="text-xs text-zinc-400 mt-1 mb-6">
                  Quét mã QR bằng ứng dụng ngân hàng hoặc ví điện tử (giả lập)
                </p>

                {/* Simulated Bank QR Code */}
                <div className="bg-white p-4 rounded-2xl inline-block shadow-2xl relative group mb-6 overflow-hidden">
                  <img 
                    src={getQrImageUrl()} 
                    alt="VietQR simulated code" 
                    className="w-48 h-48 md:w-56 md:h-56 mx-auto object-contain"
                  />
                  {/* High-tech scan lines animation */}
                  <div className="absolute inset-x-0 top-0 h-0.5 bg-primary/70 animate-scan"></div>
                </div>

                {/* Transfer Info Details */}
                <div className="bg-zinc-950/80 rounded-2xl border border-white/5 p-4 text-left space-y-2.5 mb-6">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-zinc-500">Ngân hàng thụ hưởng:</span>
                    <span className="text-white font-semibold flex items-center gap-1">
                      <Smartphone size={12} className="text-primary" />
                      MB BANK (Ngân hàng Quân Đội)
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-zinc-500">Số tài khoản:</span>
                    <span className="text-white font-mono font-bold tracking-wider">
                      8888866669999
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-zinc-500">Tên chủ tài khoản:</span>
                    <span className="text-white font-semibold">
                      CONG TY NOIR MOVIE VIETNAM
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-zinc-500">Số tiền thanh toán:</span>
                    <span className="text-primary font-bold text-sm">
                      {selectedPlan.price}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-zinc-500">Nội dung chuyển khoản:</span>
                    <span className="text-amber-400 font-mono font-bold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                      {getTransferContent()}
                    </span>
                  </div>
                </div>

                {/* Action CTA */}
                {paymentStatus === 'idle' ? (
                  <div className="space-y-3">
                    <button 
                      onClick={handleStartSimulatedPayment}
                      className="w-full bg-primary hover:bg-primary/95 text-white font-headline font-extrabold py-3.5 px-6 rounded-xl transition duration-300 flex items-center justify-center gap-2 crimson-glow"
                    >
                      Bấm vào đây để GIẢ LẬP Quét Mã Thành Công
                      <ArrowRight size={18} />
                    </button>
                    <p className="text-[10px] text-zinc-500 italic">
                      * Nhấp nút trên để bắt đầu tiến trình cổng ngân hàng phản hồi nhận được tiền giả lập.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-center gap-3">
                      <Loader size={20} className="animate-spin text-primary" />
                      <span className="text-xs text-zinc-300 font-medium">
                        Đang xác thực giao dịch qua cổng Ngân hàng ({Math.round(progress)}%)...
                      </span>
                    </div>
                    {/* Simulated progress bar */}
                    <div className="w-full bg-zinc-900 rounded-full h-1.5 overflow-hidden">
                      <div 
                        className="bg-primary h-1.5 rounded-full transition-all duration-75"
                        style={{ width: `${progress}%` }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Success State */}
            {paymentStatus === 'success' && (
              <div className="text-center py-6 animate-fade-in">
                <div className="w-20 h-20 bg-emerald-500/10 rounded-full border border-emerald-500/20 flex items-center justify-center mx-auto mb-6 text-emerald-400">
                  <Check size={44} className="stroke-[3]" />
                </div>
                <h3 className="text-2xl font-headline font-black text-white mb-2 leading-none">
                  Thanh Toán Thành Công!
                </h3>
                <p className="text-xs text-zinc-400 mb-6 max-w-sm mx-auto">
                  Tài khoản của bạn đã được nâng cấp lên gói <strong className="text-white">{selectedPlan.name}</strong> thời hạn 30 ngày thành công.
                </p>
                <div className="bg-zinc-950 rounded-xl p-4 mb-6 border border-white/5 max-w-sm mx-auto text-xs space-y-1.5 text-left">
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Mã giao dịch:</span>
                    <span className="text-white font-mono">TXN{Math.floor(Math.random() * 1000000000)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Gói đăng ký:</span>
                    <span className="text-emerald-400 font-bold">{selectedPlan.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Thời hạn:</span>
                    <span className="text-white">30 ngày (Đến {new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })})</span>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setIsQrModalOpen(false);
                    // Redirect back to profile page to review status
                    navigate('/ho-so');
                  }}
                  className="bg-emerald-500 hover:bg-emerald-600 text-black font-headline font-bold py-3.5 px-8 rounded-xl transition duration-300 w-full max-w-xs shadow-lg shadow-emerald-500/10"
                >
                  Truy Cập Hồ Sơ Của Bạn
                </button>
              </div>
            )}

            {/* Failed State */}
            {paymentStatus === 'failed' && (
              <div className="text-center py-6 animate-fade-in">
                <div className="w-20 h-20 bg-primary/10 rounded-full border border-primary/20 flex items-center justify-center mx-auto mb-6 text-primary">
                  <AlertTriangle size={44} />
                </div>
                <h3 className="text-2xl font-headline font-black text-white mb-2 leading-none">
                  Giao Dịch Thất Bại
                </h3>
                <p className="text-xs text-zinc-400 mb-6 max-w-sm mx-auto">
                  Hệ thống không thể ghi nhận giao dịch của bạn. Vui lòng thử lại hoặc liên hệ bộ phận hỗ trợ kỹ thuật.
                </p>
                <button
                  onClick={() => setPaymentStatus('idle')}
                  className="bg-primary hover:bg-primary/90 text-white font-headline font-bold py-3 px-6 rounded-xl transition duration-300 w-full max-w-xs"
                >
                  Thử lại
                </button>
              </div>
            )}

          </div>
        </div>
      )}

      {/* Styled inline animation for scan line */}
      <style>{`
        @keyframes scan {
          0% { top: 0%; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
        .animate-scan {
          position: absolute;
          width: 100%;
          animation: scan 2s linear infinite;
        }
        @keyframes pulse-slow {
          0%, 100% { border-color: rgba(245, 158, 11, 0.4); }
          50% { border-color: rgba(245, 158, 11, 0.7); }
        }
        .animate-pulse-slow {
          animation: pulse-slow 3s infinite ease-in-out;
        }
      `}</style>

    </div>
  );
};
