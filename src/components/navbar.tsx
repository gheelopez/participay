'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { CircleUser, LogOut, PenLine, Settings } from 'lucide-react'

interface NavbarProps {
  isLoggedIn: boolean
  profilePhotoUrl: string | null
  onLogout: () => void
}

export function Navbar({ isLoggedIn, profilePhotoUrl, onLogout }: NavbarProps) {
  return (
    <div className="sticky top-0 z-50 bg-transparent">
      <div className="px-8 py-6">
        <nav className="max-w-8xl mx-auto bg-white rounded-full shadow-sm">
          <div className="px-8 py-4 flex items-center justify-between">
            {/* Logo */}
            <Link href="/" className="text-2xl font-bold">
              <h1 className="text-[#132660]">
                <i>Partici</i>
                <i className="text-[#a5c4d4]">Pay</i>
              </h1>
            </Link>

            {/* Right Side */}
            <div className="flex items-center gap-9">
              {/* Navigation Links */}
              <div className="hidden md:flex items-center gap-8">
                <Link
                  href="/browse"
                  className="text-gray-700 hover:text-[#132660] transition-colors duration-200 text-base font-medium"
                >
                  Browse
                </Link>
              </div>

              {/* Auth Buttons */}
              <div className="flex items-center gap-3">
                {isLoggedIn ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="rounded-full w-10 h-10 overflow-hidden border-2 border-transparent hover:border-[#a5c4d4] transition-all duration-200 focus:outline-none">
                        {profilePhotoUrl ? (
                          <img
                            src={profilePhotoUrl}
                            alt="Profile"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="w-full h-full flex items-center justify-center bg-gray-100 text-[#132660]">
                            <CircleUser className="w-6 h-6" />
                          </span>
                        )}
                      </button>
                    </DropdownMenuTrigger>

                    <DropdownMenuContent align="end" className="w-52 rounded-2xl shadow-lg mt-2">
                      <DropdownMenuItem asChild>
                        <Link href="/account?tab=post-study" className="flex items-center gap-2 cursor-pointer">
                          <PenLine className="w-4 h-4" />
                          Post a Study
                        </Link>
                      </DropdownMenuItem>

                      <DropdownMenuItem asChild>
                        <Link href="/account?tab=profile" className="flex items-center gap-2 cursor-pointer">
                          <Settings className="w-4 h-4" />
                          Profile Settings
                        </Link>
                      </DropdownMenuItem>

                      <DropdownMenuSeparator />

                      <DropdownMenuItem
                        onClick={onLogout}
                        className="flex items-center gap-2 cursor-pointer text-red-600 focus:text-red-600"
                      >
                        <LogOut className="w-4 h-4" />
                        Log Out
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  <>
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
                      <Link href="/register">Sign Up</Link>
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </nav>
      </div>
    </div>
  )
}