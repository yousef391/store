"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Phone, Mail, MapPin, Send, MessageCircle } from "lucide-react";

const InstagramIcon = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/></svg>
);
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import Accordion from "@/components/ui/Accordion";
import { faqs } from "@/data/faqs";

const contactInfo = [
  { icon: Phone, label: "Phone", value: "+213 551 234 567", href: "tel:+213551234567" },
  { icon: MessageCircle, label: "WhatsApp", value: "+213 551 234 567", href: "https://wa.me/213551234567" },
  { icon: InstagramIcon, label: "Instagram", value: "@rova.dz", href: "https://instagram.com/rova.dz" },
  { icon: Mail, label: "Email", value: "contact@rova.dz", href: "mailto:contact@rova.dz" },
  { icon: MapPin, label: "Location", value: "Oran, Algeria", href: "#" },
];

export default function ContactPage() {
  const [formData, setFormData] = useState({ name: "", phone: "", email: "", message: "" });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <>
      <Navbar />
      <main className="pt-20 md:pt-24 min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12 md:mb-16"
          >
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent mb-3">Get In Touch</p>
            <h1 className="text-3xl md:text-5xl font-heading font-bold text-white mb-4">Contact Us</h1>
            <p className="text-sm md:text-base text-gray-400 max-w-md mx-auto">
              Have a question? We&apos;d love to hear from you. Send us a message and we&apos;ll respond within 24 hours.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16">
            {/* Contact Form */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              {submitted ? (
                <div className="glass-card rounded-2xl p-8 md:p-10 text-center">
                  <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
                    <Send size={28} className="text-emerald-400" />
                  </div>
                  <h3 className="text-xl font-heading font-bold text-white mb-2">Message Sent!</h3>
                  <p className="text-sm text-gray-400 mb-4">Thank you for reaching out. We&apos;ll get back to you shortly.</p>
                  <button
                    onClick={() => { setSubmitted(false); setFormData({ name: "", phone: "", email: "", message: "" }); }}
                    className="px-6 py-2.5 bg-white/5 text-white text-sm font-bold rounded-xl hover:bg-white/10 transition-all"
                  >
                    Send Another Message
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="glass-card rounded-2xl p-6 md:p-8 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5 block">Name *</label>
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-accent/50 transition-all"
                        placeholder="Your name"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5 block">Phone *</label>
                      <input
                        type="tel"
                        required
                        pattern="^(05|06|07)[0-9]{8}$"
                        maxLength={10}
                        title="Please enter a valid Algerian phone number (e.g., 0555123456)"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value.replace(/\D/g, '') })}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-accent/50 transition-all font-mono"
                        placeholder="05XXXXXXXX"
                        dir="ltr"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5 block">Email</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-accent/50 transition-all"
                      placeholder="your@email.com (optional)"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5 block">Message *</label>
                    <textarea
                      required
                      rows={5}
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-accent/50 transition-all resize-none"
                      placeholder="How can we help you?"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full py-3.5 bg-accent text-black font-bold text-sm rounded-xl hover:bg-accent-hover transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                  >
                    <Send size={16} />
                    Send Message
                  </button>
                </form>
              )}
            </motion.div>

            {/* Contact Info + FAQ */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="space-y-8"
            >
              {/* Contact Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {contactInfo.map((info) => (
                  <a
                    key={info.label}
                    href={info.href}
                    target={info.href.startsWith("http") ? "_blank" : undefined}
                    rel={info.href.startsWith("http") ? "noopener noreferrer" : undefined}
                    className="flex items-center gap-3 p-4 rounded-xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-all group"
                  >
                    <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center shrink-0 group-hover:bg-accent/15 transition-colors">
                      <info.icon size={18} className="text-accent" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">{info.label}</p>
                      <p className="text-sm text-white">{info.value}</p>
                    </div>
                  </a>
                ))}
              </div>

              {/* FAQ */}
              <div id="faq">
                <h3 className="text-lg font-heading font-bold text-white mb-4">Frequently Asked Questions</h3>
                <Accordion items={faqs} />
              </div>
            </motion.div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
