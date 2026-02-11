import Image from 'next/image'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div
      className="min-h-screen flex flex-col md:flex-row bg-cover bg-center bg-no-repeat"
      style={{
        backgroundImage: 'url(/bg.png)',
      }}
    >
      {/* Form Side - Left */}
      <div
        className="w-full m-9 rounded-4xl md:w-1/2 flex items-center justify-center p-6 md:p-8"
        style={{
          backgroundColor: '#F2F2F2',
        }}
      >
        <div className="w-full max-w-md">
          {children}
        </div>
      </div>

      {/* Illustration Side - Right */}
      <div className="hidden md:flex md:w-1/2 items-center justify-left pl-5">
        <div className="max-w-2xl text-left space-y-30">
          {/* Main Headline */}
          <div className="space-y-4">
            <h1 className="text-5xl font-light text-white leading-tight">
              Connecting
              <br />
              <span className="italic">Research</span> with <span className="italic">People.</span>
            </h1>
            <p className="text-2xl text-white/50 leading-[1]">
              Discover opportunities, contribute, be compensated.
            </p>
          </div>

          <div className="relative mt-12">
            <div className="relative w-full h-96">
              <div className="absolute inset-0 flex items-center justify-center opacity-10">
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}