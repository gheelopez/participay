'use client'
import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import {
  Search, Plus, BookOpen, FileText, ExternalLink,
  UserPlus, PenLine, Settings, Users, Link2, ToggleRight,
  Zap, Eye, ArrowRight, DollarSign, Utensils, Gift,
  GraduationCap, Shield, Lock
} from 'lucide-react'

function useScrollAnimation() {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add('section-visible')
          observer.unobserve(el)
        }
      },
      { threshold: 0.1 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])
  return ref
}

function Navbar() {
  return (
    <div className="sticky top-0 z-50 bg-transparent">
      <div className="px-8 py-6">
        <nav className="max-w-8xl mx-auto bg-white rounded-full shadow-lg">
          <div className="px-8 py-4 flex items-center justify-between">
            {/* Logo */}
            <span className="text-2xl font-bold">
              <h1 className='text-[#132660]'><i>Partici</i><i className='text-[#a5c4d4]'>Pay</i></h1>
            </span>

            {/* Right Side */}
            <div className="flex items-center gap-9">
              {/* Navigation Links */}
              <div className="hidden md:flex items-center gap-8">
                <Link
                  href="/browse"
                  className="text-gray-700 hover:text-[#132660] transition-colors duration-200 text-base font-medium"
                >
                  <h1>Browse</h1>
                </Link>
                <Link
                  href="/profile"
                  className="text-gray-700 hover:text-[#132660] transition-colors duration-200 text-base font-medium"
                >
                  Profile
                </Link>
              </div>

              {/* Auth Buttons */}
              <div className="flex items-center gap-3">
                <Button
                  asChild
                  variant="outline"
                  className="rounded-full border-1 border-[#132660] bg-white text-[#132660] hover:bg-gray-50 px-8 py-2 font-medium transition-all duration-200"
                >
                  <Link href="/login">Log In</Link>
                </Button>

                <Button
                  asChild
                  className="rounded-full bg-[#132660] text-white hover:bg-[#0f1d4a] px-8 py-2 font-medium transition-all duration-200"
                >
                  <Link href="/signup">Sign Up</Link>
                </Button>
              </div>
            </div>
          </div>
        </nav>
      </div>
    </div>
  )
}

function HeroSection() {
  return (
    <section className="py-55 text-center" style={{ backgroundColor: '#F4F4F4' }}>
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 fill-mode-both max-w-4xl mx-auto px-2">
        <h1 className="text-6xl md:text-6xl font-bold leading-tight mb-6 bg-gradient-to-r from-[#132660] via-[#2040a0] to-[#a5c4d4] bg-clip-text text-transparent">
          Find Research Participants.<br />
          Discover Research Opportunities.
        </h1>
        <p className="text-xl mb-10" style={{ color: '#132660' }}>
          A platform connecting researchers with willing participants for academic and scientific studies.
        </p>
        <div className="flex gap-5 justify-center flex-wrap">
          <Button
            asChild
            className="rounded-full py-6 px-6 bg-transparent border-1 border-[#132660] hover:border-[#a5c4d4] hover:bg-[#a5c4d4] hover:text-[#F4F4F4] text-[#132660] transition-all duration-300 ease-out"
          >
            <Link href="/studies" className="flex items-center gap-2">
              Browse Studies
            </Link>
          </Button>
          <Button
            asChild
            className="rounded-full py-6 px-8 bg-[#132660] text-[#F4F4F4] hover:bg-[#a5c4d4] transition-all duration-300 ease-out"
          >
            <Link href="/register" className="flex items-center gap-2">
              Post a Study
            </Link>
          </Button>
        </div>
        <p className="mt-4 text-sm" style={{ color: '#132660', opacity: '0.5'}}>
          No registration required to browse.
        </p>
      </div>
    </section>
  )
}

const participantSteps = [
  { icon: BookOpen, label: 'Browse Studies', desc: 'Explore a list of active research studies posted by verified researchers.' },
  { icon: FileText, label: 'Read the Details', desc: 'Review study requirements, compensation, and what participation involves.' },
  { icon: ExternalLink, label: 'Register Directly', desc: 'Follow the researcher\'s link to sign up — no intermediary needed.' },
]

const researcherSteps = [
  { icon: UserPlus, label: 'Create an Account', desc: 'Sign up as a researcher to start posting and managing your studies.' },
  { icon: PenLine, label: 'Post Your Study', desc: 'Fill in study details, compensation info, and add your registration link.' },
  { icon: Settings, label: 'Manage Your Post', desc: 'Open, pause, or close your study at any time from your dashboard.' },
]

function HowItWorksSection() {
  const ref = useScrollAnimation()
  return (
    <section className="py-30 bg-[#132660]">
      <div ref={ref} className="section-animate max-w-6xl mx-auto px-6">
        <h2 className="text-5xl font-semibold text-left leading-tight mb-16" style={{ color: '#F4F4F4' }}>
          How It Works
        </h2>
        <div className="grid md:grid-cols-2 gap-12">
          {/* Participants column */}
          <div style={{ transitionDelay: '0.1s' }}>
            <h3 className="text-2xl font-bold leading-tight mb-6 pb-4 border-b border-gray-400" style={{ color: '#F4F4F4' }}>
              For Participants
            </h3>
            <div className="flex flex-col gap-6">
              {participantSteps.map((step, i) => (
                <div key={i} className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm" style={{ backgroundColor: '#132660' }}>
                    <step.icon   strokeWidth={1} className="w-5 h-5" style={{ color: '#F4F4F4' }} />
                  </div>
                  <div>
                    <p className="font-medium text-[#F4F4F4]">{step.label}</p>
                    <p className="text-gray-400 text-sm mt-1">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          {/* Researchers column */}
          <div style={{ transitionDelay: '0.2s' }}>
            <h3 className="text-2xl font-bold leading-tight mb-6 pb-4 border-b border-gray-400" style={{ color: '#F4F4F4' }}>
              For Researchers
            </h3>
            <div className="flex flex-col gap-6">
              {researcherSteps.map((step, i) => (
                <div key={i} className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm">
                    <step.icon   strokeWidth={1} className="w-5 h-5" style={{ color: '#F4F4F4' }} />
                  </div>
                  <div>
                    <p className="font-medium text-[#F4F4F4]">{step.label}</p>
                    <p className="text-gray-400 text-sm mt-1">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

const researcherBenefits = [
  { icon: Users, label: 'Reach More Participants', desc: 'Get your study in front of people actively looking for research opportunities.' },
  { icon: Link2, label: 'Share Your Own Links', desc: 'Use your existing registration form — we just help people find you.' },
  { icon: ToggleRight, label: 'Control Study Status', desc: 'Open or close recruitment at any time without contacting an admin.' },
  { icon: Zap, label: 'No Complex Setup', desc: 'Post a study in minutes with a simple, straightforward form.' },
]

const participantBenefits = [
  { icon: Search, label: 'Find Legitimate Studies', desc: 'All posted studies are from registered researchers on the platform.' },
  { icon: Eye, label: 'Transparent Compensation', desc: 'See exactly what you\'ll earn or receive before deciding to participate.' },
  { icon: ArrowRight, label: 'Direct Registration', desc: 'No middleman — go straight to the researcher\'s own sign-up process.' },
]

function WhyUsSection() {
  const ref = useScrollAnimation()
  return (
    <section className="py-24" style={{ backgroundColor: '#F4F4F4' }}>
      <div ref={ref} className="section-animate max-w-6xl mx-auto px-6">
        <h2 className="text-5xl font-bold text-center leading-tight mb-4" style={{ color: '#132660' }}>
          Why Use This Platform?
        </h2>
        <p className="text-center text-gray-500 mb-16 text-lg">Built for both sides of research.</p>
        <div className="grid md:grid-cols-2 gap-12">
          {/* Researcher benefits */}
          <div>
            <h3 className="text-xl font-bold leading-tight mb-6" style={{ color: '#132660' }}>For Researchers</h3>
            <div className="flex flex-col gap-4">
              {researcherBenefits.map((b, i) => (
                <div
                  key={i}
                  className="bg-white rounded-3xl p-5 border border-[#132660] shadow-sm hover:shadow-md hover:scale-[1.02] transition-all duration-300 flex items-start gap-4"
                >
                  <div className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: '' }}>
                    <b.icon className="w-5 h-5" style={{ color: '#132660' }} />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">{b.label}</p>
                    <p className="text-gray-500 text-sm mt-1">{b.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          {/* Participant benefits */}
          <div>
            <h3 className="text-xl font-bold leading-tight mb-6" style={{ color: '#132660' }}>For Participants</h3>
            <div className="flex flex-col gap-4">
              {participantBenefits.map((b, i) => (
                <div
                  key={i}
                  className="bg-white rounded-3xl p-5 border border-[#132660] shadow-sm hover:shadow-md hover:scale-[1.02] transition-all duration-300 flex items-start gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: '' }}>
                    <b.icon className="w-5 h-5" style={{ color: '#132660' }} />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">{b.label}</p>
                    <p className="text-gray-500 text-sm mt-1">{b.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

const compensationCards = [
  {
    icon: DollarSign,
    label: 'Monetary',
    desc: 'Cash payments, GCash, or bank transfers for your time and effort.',
    iconBg: 'white',
    iconColor: '#16a34a',
  },
  {
    icon: Utensils,
    label: 'Free Food',
    desc: 'Meals, snacks, or food vouchers provided as study incentives.',
    iconBg: 'white',
    iconColor: '#ea580c',
  },
  {
    icon: Gift,
    label: 'Incentives',
    desc: 'Gift cards, tokens, raffle entries, and other non-cash rewards.',
    iconBg: 'white',
    iconColor: '#9333ea',
  },
  {
    icon: GraduationCap,
    label: 'Academic',
    desc: 'Course credits, extra points, or research units for students.',
    iconBg: 'white',
    iconColor: '#132660',
  },
]

function CompensationSection() {
  const ref = useScrollAnimation()
  return (
    <section className="py-24 bg-white rounded-4xl m-20">
      <div ref={ref} className="section-animate max-w-6xl mx-auto px-6">
        <h2 className="text-5xl font-bold text-center leading-tight mb-4" style={{ color: '#132660' }}>
          What You Might Earn
        </h2>
        <p className="text-center text-gray-500 mb-16 text-lg">
          Researchers offer a variety of compensation types for participation.
        </p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {compensationCards.map((card, i) => (
            <div
              key={i}
              className='text-center'
              style={{ borderTopColor: '#132660' }}
            >
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 mx-auto"
                style={{ backgroundColor: card.iconBg }}
              >
                <card.icon className="w-8 h-8" style={{ color: card.iconColor }} />
              </div>
              <h3 className="font-bold text-gray-900 leading-tight mb-2">{card.label}</h3>
              <p className="text-gray-500 text-sm">{card.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function TrustSection() {
  const ref = useScrollAnimation()
  return (
    <section className="py-24" style={{ backgroundColor: '#132660' }}>
      <div ref={ref} className="section-animate max-w-6xl mx-auto px-6 text-center">
        <h2 className="text-5xl font-bold text-white leading-tight mb-4">
          Simple. Transparent. Safe.
        </h2>
        <p className="mb-16 text-lg" style={{ color: 'rgba(255,255,255,0.7)' }}>
          We built this platform with trust at its core — for participants and researchers alike.
        </p>
        <div className="grid sm:grid-cols-2 gap-6 max-w-2xl mx-auto">
          <div className="rounded-2xl p-6 border text-left hover:bg-white/15 transition-all duration-300" style={{ backgroundColor: 'rgba(255,255,255,0.1)', borderColor: 'rgba(255,255,255,0.2)' }}>
            <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4" style={{ backgroundColor: '' }}>
              <Shield className="w-6 h-6 text-white" />
            </div>
            <h3 className="font-bold text-white leading-tight mb-2">No Data Collection</h3>
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.7)' }}>
              We don&apos;t collect or store personal data from participants. Your information stays between you and the researcher.
            </p>
          </div>
          <div className="rounded-2xl p-6 border text-left hover:bg-white/15 transition-all duration-300" style={{ backgroundColor: 'rgba(255,255,255,0.1)', borderColor: 'rgba(255,255,255,0.2)' }}>
            <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4" style={{ backgroundColor: '' }}>
              <Lock className="w-6 h-6 text-white" />
            </div>
            <h3 className="font-bold text-white leading-tight mb-2">Transparent Process</h3>
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.7)' }}>
              Every study clearly shows what&apos;s involved, who is running it, and what compensation is offered before you commit.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

function Footer() {
  return (
    <footer className="py-20" style={{ backgroundColor: '#1E1E1E' }}>
      <div className=" mx-10 px-2">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 mb-8 mt-10">
          <div>
            <h2 className="text-4xl font-bold leading-tight mb-4" style={{ color: '#f4f4f4' }}>
              Ready to participate or recruit?
            </h2>
            <p className="text-lg mb-10" style={{ color: '#f4f4f4', opacity: '0.5' }}>
              Join researchers and participants already using ParticiPay.
            </p>
          </div>
          <div className="flex flex-wrap gap-6">
            <Link href="/studies" className="text-sm transition-colors duration-200" style={{ color: 'rgba(255,255,255,0.6)' }}>
              Browse Studies
            </Link>
            <Link href="/login" className="text-sm transition-colors duration-200" style={{ color: 'rgba(255,255,255,0.6)' }}>
              Log In
            </Link>
            <Link href="/register" className="text-sm transition-colors duration-200" style={{ color: 'rgba(255,255,255,0.6)' }}>
              Sign Up
            </Link>
          </div>
        </div>
        <div className="pt-8" style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
            {new Date().getFullYear()} &copy; Bilbao, Bon, David, Lopez
          </p>
        </div>
      </div>
    </footer>
  )
}

export default function Home() {
  return (
    <div className="min-h-screen bg-[#F4F4F4]">
      <Navbar />
      <HeroSection />
      <HowItWorksSection />
      <WhyUsSection />
      <CompensationSection />
      <TrustSection />
      <Footer />
    </div>
  )
}
