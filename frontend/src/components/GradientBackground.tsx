"use client";

export default function GradientBackground() {
  return (
    <>
      {/* Desktop background */}
      <div 
        className="fixed inset-0 -z-10 hidden md:block"
        style={{
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: `
            url('${process.env.NEXT_PUBLIC_BASE_PATH || ''}/mountains.svg') no-repeat 50% / cover,
            linear-gradient(178.54deg, rgba(255, 213, 224, 0) 8.52%, rgba(255, 212, 224, 0.657536) 56.19%, rgb(247, 168, 191) 98.75%),
            linear-gradient(180deg, rgba(196, 220, 246, 0.5) -21.37%, rgba(255, 255, 255, 0.5) 47.33%)
          `,
          backgroundBlendMode: 'normal'
        }}
      />
      {/* Mobile background */}
      <div 
        className="fixed inset-0 -z-10 block md:hidden"
        style={{
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: `
            url('${process.env.NEXT_PUBLIC_BASE_PATH || ''}/main/mountains_mobile.svg') no-repeat 50% / cover,
            linear-gradient(178.54deg, rgba(255, 213, 224, 0) 8.52%, rgba(255, 212, 224, 0.657536) 56.19%, rgb(247, 168, 191) 98.75%),
            linear-gradient(180deg, rgba(196, 220, 246, 0.5) -21.37%, rgba(255, 255, 255, 0.5) 47.33%)
          `,
          backgroundBlendMode: 'normal'
        }}
      />
    </>
  );
}

