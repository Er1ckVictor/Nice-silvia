import Header from '@/components/home/Header';
import Hero from '@/components/home/Hero';
import Marquee from '@/components/home/Marquee';
import Services from '@/components/home/Services';
import Products from '@/components/home/Products';
import Works from '@/components/home/Works';
import About from '@/components/home/About';
import BookingCta from '@/components/home/BookingCta';
import Footer from '@/components/home/Footer';
import HomeEffects from '@/components/home/HomeEffects';

export default function Home() {
  return (
    <>
      <Header />
      <HomeEffects />
      <main>
        <Hero />
        <Marquee />
        <Services />
        <Products />
        <Works />
        <About />
        <BookingCta />
      </main>
      <Footer />
    </>
  );
}
