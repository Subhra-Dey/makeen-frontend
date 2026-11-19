import { ChartLine, Factory, ShieldCheck } from 'lucide-react';
import type { ReactNode } from 'react';
import { Logo } from '@/components/brand/Logo';

/**
 * Sign-in frame (mockup auth views): plant photo with the brand message on the left, the form on
 * the right. On phones the photo panel sits above the form.
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-wrap bg-surface">
      <div
        className="flex min-h-[420px] min-w-0 flex-[1_1_52%] flex-col justify-between gap-10 bg-cover bg-center px-6 py-8 nav:min-h-[640px] nav:px-16 nav:pt-16 nav:pb-10"
        style={{
          backgroundImage:
            'linear-gradient(160deg, rgba(236,245,249,.85) 0%, rgba(236,245,249,.6) 32%, rgba(236,245,249,0) 58%), linear-gradient(0deg, rgba(11,46,70,.94) 0%, rgba(11,46,70,.55) 16%, rgba(11,46,70,0) 32%), url(/images/login-plant.jpg)',
        }}
      >
        <div>
          <Logo size="lg" />
        </div>
        <div>
          <p className="m-0 font-heading text-[32px] leading-[1.12] font-bold tracking-[-0.02em] text-navy nav:text-[46px]">
            Operational Excellence.
            <br />
            <span className="text-teal">Together.</span>
          </p>
          <p className="mt-[18px] mb-[22px] max-w-[430px] text-[18px] leading-normal text-[#2E465C]">
            Daily MIS, safety checks and approvals for every LPG plant — in one place.
          </p>
          <i aria-hidden="true" className="block h-[3px] w-16 rounded-xs bg-teal" />
        </div>
        <ul className="m-0 flex list-none p-0 text-[14px] text-white">
          {[
            { icon: ChartLine, a: 'Real-time', b: 'MIS' },
            { icon: ShieldCheck, a: 'Safety', b: 'exceptions' },
            { icon: Factory, a: '22 LPG', b: 'plants' },
          ].map(({ icon: Icon, a, b }, i) => (
            <li
              key={a}
              className={
                'flex flex-col gap-2 px-3.5 nav:px-[30px] ' +
                (i === 0 ? 'pl-0 nav:pl-0' : 'border-l border-white/30')
              }
            >
              <Icon aria-hidden="true" className="size-[22px]" strokeWidth={1.8} />
              <span>
                {a}
                <br />
                {b}
              </span>
            </li>
          ))}
        </ul>
      </div>
      <main className="flex min-w-0 flex-[1_1_44%] items-center justify-center bg-[linear-gradient(135deg,#fff_70%,#EEF7F9_100%)] px-7 py-12">
        <div className="flex w-full max-w-[470px] flex-col gap-5">{children}</div>
      </main>
    </div>
  );
}
