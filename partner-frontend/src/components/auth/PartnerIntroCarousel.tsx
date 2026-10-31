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
    <div className="min-h-[100dvh] h-[100dvh] w-full flex flex-col justify-between bg-white max-w-md mx-auto overflow-hidden select-none selection:bg-blue-500/20">
      {/* Top Visual Slide Section (Occupies available space like native app in Image 1) */}
      <div
        className="relative flex-1 w-full overflow-hidden bg-zinc-950 cursor-grab active:cursor-grabbing"
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

        {/* Top subtle vignette */}
        <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-black/40 to-transparent z-20 pointer-events-none" />

        {/* Bottom Dark Gradient Overlay for Brand & Typography */}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/75 to-transparent pt-32 pb-6 px-6 z-20 flex flex-col justify-end">
          {/* QuickPress Partner Onboarding Brand Lockup (Matches User Image 2) */}
          <div className="mb-3">
            <div className="flex items-center gap-0.5">
              <span className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white drop-shadow-md">
                Quick
              </span>
              <span className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#059669] drop-shadow-md">
                Press
              </span>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="h-[2px] w-5 bg-[#059669]" />
              <span className="text-[10px] font-black uppercase tracking-[0.22em] text-white/90">
                PARTNER ONBOARDING
              </span>
              <span className="h-[2px] w-5 bg-[#059669]" />
            </div>
          </div>

          {/* Slide Heading */}
          <h2 className="text-2xl sm:text-[26px] font-black text-white leading-tight mb-2 drop-shadow-md">
            {currentSlide.title}
          </h2>

          {/* Slide Subtitle */}
          <p className="text-xs sm:text-sm text-white/80 line-clamp-2 leading-relaxed mb-4">
            {currentSlide.subtitle}
          </p>

          {/* Carousel Pagination Dots (Exact 3-dot style in Image 1) */}
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
                    ? "w-4 h-1.5 bg-white shadow-xs"
                    : "size-1.5 bg-white/40 hover:bg-white/70"
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
          className="hidden sm:flex absolute left-3 top-1/2 -translate-y-1/2 z-30 size-9 items-center justify-center rounded-full bg-black/40 hover:bg-black/60 text-white backdrop-blur-xs transition-all cursor-pointer opacity-0 hover:opacity-100"
          aria-label="Previous slide"
        >
          <ChevronLeft className="size-5" />
        </button>

        <button
          type="button"
          onClick={() => {
            setCurrentIndex((prev) => (prev + 1) % INTRO_SLIDES.length);
            resetTimer();
          }}
          className="hidden sm:flex absolute right-3 top-1/2 -translate-y-1/2 z-30 size-9 items-center justify-center rounded-full bg-black/40 hover:bg-black/60 text-white backdrop-blur-xs transition-all cursor-pointer opacity-0 hover:opacity-100"
          aria-label="Next slide"
        >
          <ChevronRight className="size-5" />
        </button>
      </div>

      {/* Bottom Action Buttons (Exact Match to Screenshot in Image 1) */}
      <div className="w-full px-5 pt-3.5 pb-6 space-y-2.5 bg-white shrink-0">
        <button
          type="button"
          onClick={onLoginClick}
          className="w-full py-3.5 px-4 rounded-xl bg-[#2563eb] hover:bg-[#1d4ed8] active:scale-[0.99] text-white font-bold text-base shadow-sm transition-all cursor-pointer flex items-center justify-center"
        >
          Login
        </button>

        <button
          type="button"
          onClick={onSignUpClick}
          className="w-full py-3.5 px-4 rounded-xl bg-white border border-[#2563eb] hover:bg-blue-50/50 active:scale-[0.99] text-[#2563eb] font-bold text-base transition-all cursor-pointer flex items-center justify-center"
        >
          Sign up
        </button>
      </div>
    </div>
  );
}
