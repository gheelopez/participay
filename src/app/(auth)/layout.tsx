import Image from 'next/image'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    // Added bg-white to the main wrapper to ensure the "gutter" is white
    <div className="min-h-screen flex flex-col md:flex-row bg-white">
      
      {/* Form Side - Left */}
      <div className="w-full md:w-1/2 flex items-center justify-center p-6 md:p-8">
        <div className="w-full max-w-md">
          {children}
        </div>
      </div>

      {/* Illustration Side - Right */}
      {/* 1. Added p-4 to create the "inset" look (the white space around the box).
          2. The inner div now carries the background color and rounded corners.
      */}
      <div className="hidden md:flex md:w-1/2 p-16"> 
        <div 
          className="w-full h-full rounded-3xl flex flex-col items-center justify-center p-12"
          style={{ backgroundColor: '#dfe4f0' }}
        >
          <div className="max-w-lg text-center space-y-6">
            <Image
              src="/registration.jpeg"
              alt="Participay Illustration"
              width={600}
              height={600}
              className="mx-auto"
              priority
            />
            <div className="space-y-2">
              <h2 className="text-3xl font-bold text-slate-900">
                Join Participay
              </h2>
              <p className="text-slate-700 text-lg">
                Connect with research opportunities and earn while participating in studies.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}