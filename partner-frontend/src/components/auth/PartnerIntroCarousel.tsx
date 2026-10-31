import { useState, useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export interface IntroSlide {
  id: string;
  image: string;
  title: string;
  subtitle: string;
}

export const INTRO_SLIDES: IntroSlide[] = [
  {
    id: "insights",
    image: "/images/onboarding/slide-2.jpg",
    title: "Get business insights and improvement tips",
    subtitle: "Track daily revenue, laundry wash volume, and garment turnaround times in real time.",
  },
  {
    id: "orders",
    image: "/images/onboarding/slide-1.jpg",
    title: "Manage orders and menu in a breeze",
    subtitle: "Receive live laundry orders, manage wash & iron stages, and dispatch seamless pickups.",
  },
  {
    id: "growth",
    image: "/images/onboarding/slide-3.jpg",
    title: "Create promotions and grow your business",
    subtitle: "Reach thousands of local households in your area and boost repeat laundry orders.",
  },
];

interface PartnerIntroCarouselProps {
  onLoginClick: () => void;
  onSignUpClick: () => void;
}

export function PartnerIntroCarousel({
  onLoginClick,
  onSignUpClick,
}: PartnerIntroCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-advance carousel every 4.5 seconds
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % INTRO_SLIDES.length);
    }, 4500);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const resetTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % INTRO_SLIDES.length);
    }, 4500);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe) {
      setCurrentIndex((prev) => (prev + 1) % INTRO_SLIDES.length);
      resetTimer();
    } else if (isRightSwipe) {
      setCurrentIndex((prev) => (prev - 1 + INTRO_SLIDES.length) % INTRO_SLIDES.length);
      resetTimer();
    }
  };

  const currentSlide = INTRO_SLIDES[currentIndex];

  return (
    <div className="relative flex flex-col justify-between min-h-[92vh] max-w-sm sm:max-w-md mx-auto w-full px-4 pt-3 pb-6 selection:bg-blue-500/20">
      {/* Visual Carousel Card */}
      <div
        className="relative w-full aspect-[9/13] max-h-[580px] rounded-3xl overflow-hidden border border-zinc-200/90 shadow-lg shadow-zinc-900/5 select-none bg-zinc-900 cursor-grab active:cursor-grabbing"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Background Image Slide with Fade Transition */}
        {INTRO_SLIDES.map((slide, idx) => (
          <div
            key={slide.id}
            className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
              idx === currentIndex ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none"
            }`}
          >
            <img
              src={slide.image}
              alt={slide.title}
              className="w-full h-full object-cover"
            />
          </div>
        ))}

        {/* Ambient Top Vignette for Mobile Notch / Bar */}
        <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-black/40 via-transparent to-transparent z-20 pointer-events-none" />

        {/* Bottom Gradient Overlay for Typography */}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-black/60 to-transparent pt-36 pb-6 px-6 z-20 flex flex-col justify-end">
          {/* QuickPress Brand Lockup */}
          <div className="mb-2">
            <h1 className="text-2xl sm:text-3xl font-black italic tracking-tight text-white drop-shadow-sm font-sans">
              quick<span className="text-blue-400">press</span>
            </h1>
            <p className="text-[10.5px] font-bold tracking-wider text-white/80 uppercase mt-0.5">
              — laundry partner —
            </p>
          </div>

          {/* Slide Heading */}
          <h2 className="text-xl sm:text-2xl font-black text-white leading-tight mb-2 drop-shadow-sm">
            {currentSlide.title}
          </h2>

          {/* Slide Subtitle */}
          <p className="text-xs text-white/80 line-clamp-2 leading-relaxed mb-4">
            {currentSlide.subtitle}
          </p>

          {/* Carousel Pagination Dots */}
          <div className="flex items-center gap-1.5 pt-1">
            {INTRO_SLIDES.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => {
                  setCurrentIndex(i);
                  resetTimer();
                }}
                className={`transition-all duration-300 rounded-full cursor-pointer ${
                  currentIndex === i
                    ? "w-6 h-1.5 bg-white shadow-xs"
                    : "w-1.5 h-1.5 bg-white/40 hover:bg-white/70"
                }`}
                aria-label={`Go to slide ${i + 1}`}
              />
            ))}
          </div>
        </div>

        {/* Desktop Left/Right Click Nav Hints */}
        <button
          type="button"
          onClick={() => {
            setCurrentIndex((prev) => (prev - 1 + INTRO_SLIDES.length) % INTRO_SLIDES.length);
            resetTimer();
          }}
          className="hidden sm:flex absolute left-2.5 top-1/2 -translate-y-1/2 z-30 size-8 items-center justify-center rounded-full bg-black/40 hover:bg-black/60 text-white backdrop-blur-xs transition-all cursor-pointer opacity-0 hover:opacity-100"
          aria-label="Previous slide"
        >
          <ChevronLeft className="size-4" />
        </button>

        <button
          type="button"
          onClick={() => {
            setCurrentIndex((prev) => (prev + 1) % INTRO_SLIDES.length);
            resetTimer();
          }}
          className="hidden sm:flex absolute right-2.5 top-1/2 -translate-y-1/2 z-30 size-8 items-center justify-center rounded-full bg-black/40 hover:bg-black/60 text-white backdrop-blur-xs transition-all cursor-pointer opacity-0 hover:opacity-100"
          aria-label="Next slide"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>

      {/* Bottom Action Buttons (Exact Match to Screenshot) */}
      <div className="w-full pt-4 space-y-2.5">
        <button
          type="button"
          onClick={onLoginClick}
          className="w-full py-3.5 px-4 rounded-xl bg-[#2563eb] hover:bg-[#1d4ed8] active:scale-[0.99] text-white font-bold text-sm sm:text-base shadow-sm transition-all cursor-pointer flex items-center justify-center gap-2"
        >
          Login
        </button>

        <button
          type="button"
          onClick={onSignUpClick}
          className="w-full py-3.5 px-4 rounded-xl bg-white border border-[#2563eb] hover:bg-blue-50/50 active:scale-[0.99] text-[#2563eb] font-bold text-sm sm:text-base transition-all cursor-pointer flex items-center justify-center gap-2"
        >
          Sign up
        </button>

        <p className="text-[10px] text-zinc-400 text-center pt-1 font-medium">
          QuickPress Laundry & Dry Cleaning Partner Network
        </p>
      </div>
    </div>
  );
}
