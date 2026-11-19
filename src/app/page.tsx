import { redirect } from 'next/navigation';

/** Every successful sign-in opens Dashboard (spec Product, UXV-4). */
export default function Home() {
  redirect('/dashboard');
}
