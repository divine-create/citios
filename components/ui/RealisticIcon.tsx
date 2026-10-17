'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

export interface RealisticIconProps {
  name: string;
  size?: number;
  className?: string;
  fallback?: string | React.ReactNode;
  imageUrl?: string;
}

/**
 * Realistic & 3D Rendered Category & Portal Icons
 * Designed with volumetric gradients, specular lighting, and soft drop shadows
 * for instant, crisp rendering without network latency or cross-platform emoji variance.
 */
export default function RealisticIcon({
  name,
  size = 40,
  className,
  fallback,
  imageUrl,
}: RealisticIconProps) {
  const [imageError, setImageError] = useState(false);

  // If a custom external image URL is provided and has not errored, render it
  if (imageUrl && !imageError) {
    return (
      <Image
        src={imageUrl}
        alt={name}
        width={size}
        height={size}
        className={cn('object-contain drop-shadow-sm select-none', className)}
        onError={() => setImageError(true)}
      />
    );
  }

  const key = name.toLowerCase().trim();

  // 1. Soups & Swallow (Traditional Calabar Clay Pot with steaming Afang/Egusi soup and golden swallow)
  if (key === 'soups-swallow' || key === 'soups' || key === 'soup') {
    return (
      <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={cn('select-none drop-shadow-sm', className)}>
        <defs>
          <radialGradient id="soup_pot" cx="50%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#374151" />
            <stop offset="60%" stopColor="#1F2937" />
            <stop offset="100%" stopColor="#111827" />
          </radialGradient>
          <radialGradient id="soup_broth" cx="45%" cy="35%" r="60%">
            <stop offset="0%" stopColor="#16A34A" />
            <stop offset="45%" stopColor="#15803D" />
            <stop offset="90%" stopColor="#14532D" />
          </radialGradient>
          <radialGradient id="swallow_ball" cx="35%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#FEF08A" />
            <stop offset="60%" stopColor="#FACC15" />
            <stop offset="100%" stopColor="#CA8A04" />
          </radialGradient>
          <linearGradient id="crayfish" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#EF4444" />
            <stop offset="100%" stopColor="#991B1B" />
          </linearGradient>
        </defs>
        {/* Pot Base & Handles */}
        <ellipse cx="32" cy="56" rx="20" ry="4" fill="#000000" fillOpacity="0.15" />
        <path d="M12 28C10 28 8 30 8 33C8 36 10 38 12 38" stroke="#4B5563" strokeWidth="3" strokeLinecap="round" />
        <path d="M52 28C54 28 56 30 56 33C56 36 54 38 52 38" stroke="#4B5563" strokeWidth="3" strokeLinecap="round" />
        <path d="M12 26C12 26 12 50 32 50C52 50 52 26 52 26Z" fill="url(#soup_pot)" />
        {/* Pot Rim */}
        <ellipse cx="32" cy="26" rx="20" ry="7" fill="#4B5563" />
        <ellipse cx="32" cy="26" rx="18.5" ry="5.5" fill="url(#soup_broth)" />
        {/* Crayfish & Pepper flecks */}
        <ellipse cx="26" cy="25" rx="3.5" ry="2" fill="url(#crayfish)" transform="rotate(-15 26 25)" />
        <circle cx="37" cy="24" r="1.5" fill="#DC2626" />
        <circle cx="33" cy="28" r="1.2" fill="#F97316" />
        {/* Yellow Swallow / Garri Mound */}
        <ellipse cx="44" cy="38" rx="12" ry="10" fill="url(#swallow_ball)" />
        <ellipse cx="42" cy="34" rx="4" ry="2" fill="#FEF9C3" fillOpacity="0.7" />
        {/* Steam Wisps */}
        <path d="M26 17C24 14 27 11 25 8" stroke="#E2E8F0" strokeWidth="2" strokeLinecap="round" opacity="0.65" />
        <path d="M34 16C36 13 33 10 35 7" stroke="#E2E8F0" strokeWidth="2.2" strokeLinecap="round" opacity="0.8" />
      </svg>
    );
  }

  // 2. Jollof & Rice (Glistening Party Jollof with golden fried plantain dodo)
  if (key === 'rice-jollof' || key === 'jollof' || key === 'rice') {
    return (
      <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={cn('select-none drop-shadow-sm', className)}>
        <defs>
          <radialGradient id="platter" cx="50%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="85%" stopColor="#E2E8F0" />
            <stop offset="100%" stopColor="#CBD5E1" />
          </radialGradient>
          <radialGradient id="jollof_mound" cx="45%" cy="30%" r="65%">
            <stop offset="0%" stopColor="#FB923C" />
            <stop offset="40%" stopColor="#EA580C" />
            <stop offset="85%" stopColor="#C2410C" />
            <stop offset="100%" stopColor="#9A3412" />
          </radialGradient>
          <linearGradient id="plantain" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#FBBF24" />
            <stop offset="50%" stopColor="#D97706" />
            <stop offset="100%" stopColor="#78350F" />
          </linearGradient>
        </defs>
        <ellipse cx="32" cy="56" rx="22" ry="4" fill="#000000" fillOpacity="0.12" />
        {/* Ceramic Platter */}
        <ellipse cx="32" cy="42" rx="24" ry="12" fill="url(#platter)" stroke="#E2E8F0" strokeWidth="1.5" />
        <ellipse cx="32" cy="41" rx="21" ry="9" fill="#F8FAFC" />
        {/* Jollof Rice Mound */}
        <path d="M16 38C16 26 23 20 32 20C41 20 48 26 48 38C48 44 41 46 32 46C23 46 16 44 16 38Z" fill="url(#jollof_mound)" />
        {/* Rice Grain Texture & Highlights */}
        <circle cx="28" cy="26" r="1.2" fill="#FED7AA" />
        <circle cx="34" cy="24" r="1.4" fill="#FFEDD5" />
        <circle cx="25" cy="31" r="1.1" fill="#FFEDD5" />
        <circle cx="38" cy="29" r="1.2" fill="#FED7AA" />
        <circle cx="32" cy="33" r="1.3" fill="#FFF7ED" />
        {/* Fried Plantain (Dodo) Slices */}
        <path d="M38 36C38 33 46 32 48 35C50 38 44 43 40 41C38 40 38 38 38 36Z" fill="url(#plantain)" stroke="#92400E" strokeWidth="0.8" />
        <path d="M43 40C43 38 49 37 51 39C52 42 47 45 44 44C43 43 43 41 43 40Z" fill="url(#plantain)" />
        {/* Pepper / Parsley Garnish */}
        <path d="M30 20C32 17 31 15 32 14" stroke="#16A34A" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx="33" cy="19" r="1.5" fill="#DC2626" />
      </svg>
    );
  }

  // 3. Suya & Grills (Charcoal roasted spicy beef skewers with sliced onions and embers)
  if (key === 'suya-grills' || key === 'suya' || key === 'grills' || key === 'grill') {
    return (
      <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={cn('select-none drop-shadow-sm', className)}>
        <defs>
          <linearGradient id="skewer_stick" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#FDE68A" />
            <stop offset="100%" stopColor="#D97706" />
          </linearGradient>
          <radialGradient id="suya_meat" cx="40%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#B91C1C" />
            <stop offset="40%" stopColor="#7F1D1D" />
            <stop offset="85%" stopColor="#450A0A" />
            <stop offset="100%" stopColor="#1C1917" />
          </radialGradient>
        </defs>
        <ellipse cx="32" cy="58" rx="18" ry="3.5" fill="#000000" fillOpacity="0.15" />
        {/* Skewer Sticks */}
        <line x1="14" y1="56" x2="48" y2="12" stroke="url(#skewer_stick)" strokeWidth="3" strokeLinecap="round" />
        <line x1="22" y1="58" x2="54" y2="16" stroke="url(#skewer_stick)" strokeWidth="2.5" strokeLinecap="round" opacity="0.8" />
        {/* Meat Chunks on First Skewer */}
        <rect x="36" y="16" width="13" height="10" rx="3.5" transform="rotate(-45 36 16)" fill="url(#suya_meat)" />
        <rect x="27" y="27" width="14" height="11" rx="4" transform="rotate(-45 27 27)" fill="url(#suya_meat)" />
        <rect x="18" y="38" width="13" height="10" rx="3.5" transform="rotate(-45 18 38)" fill="url(#suya_meat)" />
        {/* Yaji Spice Powder Grains */}
        <circle cx="34" cy="26" r="1.2" fill="#F97316" />
        <circle cx="41" cy="22" r="1" fill="#FBBF24" />
        <circle cx="28" cy="34" r="1.2" fill="#F97316" />
        <circle cx="23" cy="42" r="1.2" fill="#EF4444" />
        {/* Sliced Red Onion Rings */}
        <circle cx="44" cy="38" r="7" stroke="#F43F5E" strokeWidth="2" fill="none" opacity="0.85" />
        <circle cx="44" cy="38" r="5" stroke="#FDA4AF" strokeWidth="1" fill="none" opacity="0.6" />
        {/* Fiery Embers */}
        <circle cx="48" cy="14" r="2" fill="#F59E0B" />
        <circle cx="53" cy="10" r="1.2" fill="#EF4444" />
      </svg>
    );
  }

  // 4. Chicken & Proteins (Golden roasted crispy chicken drumstick with pepper glaze)
  if (key === 'chicken-meat' || key === 'chicken' || key === 'meat') {
    return (
      <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={cn('select-none drop-shadow-sm', className)}>
        <defs>
          <radialGradient id="chicken_crisp" cx="40%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#FDBA74" />
            <stop offset="35%" stopColor="#EA580C" />
            <stop offset="75%" stopColor="#C2410C" />
            <stop offset="100%" stopColor="#7C2D12" />
          </radialGradient>
          <linearGradient id="bone" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#F8FAFC" />
            <stop offset="100%" stopColor="#CBD5E1" />
          </linearGradient>
        </defs>
        <ellipse cx="34" cy="56" rx="18" ry="4" fill="#000000" fillOpacity="0.14" />
        {/* Bone Shaft & Knobs */}
        <path d="M18 46L24 40" stroke="url(#bone)" strokeWidth="4.5" strokeLinecap="round" />
        <circle cx="15" cy="48" r="3" fill="url(#bone)" />
        <circle cx="18" cy="51" r="3" fill="url(#bone)" />
        {/* Chicken Drumstick Plump Meat */}
        <path d="M22 38C18 33 22 21 31 16C40 11 50 16 52 25C54 34 46 44 36 45C28 46 25 42 22 38Z" fill="url(#chicken_crisp)" />
        {/* Crispy Texture & Glaze Sheen */}
        <ellipse cx="37" cy="23" rx="7" ry="4" transform="rotate(-30 37 23)" fill="#FFEDD5" fillOpacity="0.5" />
        <circle cx="44" cy="28" r="1.5" fill="#EF4444" />
        <circle cx="34" cy="32" r="1.3" fill="#DC2626" />
        <circle cx="38" cy="38" r="1.2" fill="#F97316" />
        <circle cx="46" cy="22" r="1.2" fill="#FEF08A" />
      </svg>
    );
  }

  // 5. Shawarma & Fast Eats (Toasted double wrap bursting with chicken, sausage & golden fries)
  if (key === 'fast-food-shawarma' || key === 'shawarma' || key === 'fast-food' || key === 'burger') {
    return (
      <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={cn('select-none drop-shadow-sm', className)}>
        <defs>
          <linearGradient id="pita_wrap" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#FEF3C7" />
            <stop offset="40%" stopColor="#FDE68A" />
            <stop offset="80%" stopColor="#F59E0B" />
            <stop offset="100%" stopColor="#B45309" />
          </linearGradient>
          <linearGradient id="sausage" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#DC2626" />
            <stop offset="100%" stopColor="#7F1D1D" />
          </linearGradient>
        </defs>
        <ellipse cx="32" cy="56" rx="20" ry="4" fill="#000000" fillOpacity="0.14" />
        {/* Shawarma Wrap Body */}
        <path d="M16 48L32 16L48 48C44 52 20 52 16 48Z" fill="url(#pita_wrap)" />
        {/* Grill Toast Lines */}
        <path d="M22 42L28 30" stroke="#78350F" strokeWidth="1.8" strokeLinecap="round" opacity="0.6" />
        <path d="M30 44L36 32" stroke="#78350F" strokeWidth="1.8" strokeLinecap="round" opacity="0.6" />
        <path d="M38 43L44 31" stroke="#78350F" strokeWidth="1.8" strokeLinecap="round" opacity="0.6" />
        {/* Fillings Peeking Out of Top */}
        <ellipse cx="32" cy="18" rx="11" ry="6" fill="#15803D" />
        <circle cx="28" cy="18" r="3" fill="url(#sausage)" />
        <circle cx="35" cy="17" r="3.2" fill="#B91C1C" />
        <ellipse cx="32" cy="20" rx="6" ry="2" fill="#FEF08A" />
        {/* Drizzling Creamy Sauce */}
        <path d="M31 22C31 26 33 27 33 30" stroke="#FFFBEB" strokeWidth="2.5" strokeLinecap="round" />
        {/* Crispy French Fries in Background */}
        <rect x="46" y="24" width="3.5" height="18" rx="1.5" transform="rotate(15 46 24)" fill="#FBBF24" />
        <rect x="50" y="27" width="3.5" height="16" rx="1.5" transform="rotate(25 50 27)" fill="#F59E0B" />
      </svg>
    );
  }

  // 6. Pizza & Pasta (Artisan melted cheese pizza slice with bubbling mozzarella & pasta)
  if (key === 'pizza-pasta' || key === 'pizza' || key === 'pasta') {
    return (
      <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={cn('select-none drop-shadow-sm', className)}>
        <defs>
          <linearGradient id="crust" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#FDE68A" />
            <stop offset="50%" stopColor="#D97706" />
            <stop offset="100%" stopColor="#92400E" />
          </linearGradient>
          <radialGradient id="cheese" cx="45%" cy="40%" r="65%">
            <stop offset="0%" stopColor="#FEF08A" />
            <stop offset="60%" stopColor="#FACC15" />
            <stop offset="100%" stopColor="#EA580C" />
          </radialGradient>
        </defs>
        <ellipse cx="32" cy="56" rx="18" ry="3.5" fill="#000000" fillOpacity="0.14" />
        {/* Pizza Crust Arc */}
        <path d="M12 24C22 14 42 14 52 24C53 26 51 28 49 28C39 20 25 20 15 28C13 28 11 26 12 24Z" fill="url(#crust)" />
        {/* Pizza Body Triangle */}
        <path d="M15 26L32 54L49 26C38 21 26 21 15 26Z" fill="url(#cheese)" />
        {/* Pepperoni Disks */}
        <circle cx="28" cy="33" r="4" fill="#B91C1C" stroke="#7F1D1D" strokeWidth="0.8" />
        <circle cx="36" cy="37" r="3.5" fill="#DC2626" stroke="#991B1B" strokeWidth="0.8" />
        <circle cx="32" cy="45" r="2.8" fill="#B91C1C" stroke="#7F1D1D" strokeWidth="0.8" />
        {/* Melted Cheese Glaze & Basil */}
        <circle cx="25" cy="40" r="1.5" fill="#15803D" />
        <circle cx="39" cy="30" r="1.2" fill="#16A34A" />
        <path d="M30 48C31 51 33 51 32 55" stroke="#FEF08A" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }

  // 7. Pastries & Bakery (Golden crusted meatpie with crimped edges & glazed donut)
  if (key === 'pastries-bakery' || key === 'pastries' || key === 'bakery' || key === 'pastry') {
    return (
      <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={cn('select-none drop-shadow-sm', className)}>
        <defs>
          <radialGradient id="meatpie_crust" cx="50%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#FDE68A" />
            <stop offset="40%" stopColor="#F59E0B" />
            <stop offset="80%" stopColor="#D97706" />
            <stop offset="100%" stopColor="#92400E" />
          </radialGradient>
          <linearGradient id="donut_icing" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#F472B6" />
            <stop offset="100%" stopColor="#DB2777" />
          </linearGradient>
        </defs>
        <ellipse cx="32" cy="56" rx="20" ry="4" fill="#000000" fillOpacity="0.14" />
        {/* Half-Moon Nigerian Meat Pie */}
        <path d="M10 40C10 22 26 16 46 26C48 36 40 48 20 46C14 45 10 42 10 40Z" fill="url(#meatpie_crust)" />
        {/* Crimped Edge Marks */}
        <path d="M12 40C14 42 16 44 20 45C26 46 36 44 44 30C46 27 46 26 46 26" stroke="#78350F" strokeWidth="2" strokeDasharray="2 3" strokeLinecap="round" opacity="0.7" />
        {/* Steam Holes */}
        <circle cx="28" cy="28" r="1.3" fill="#78350F" />
        <circle cx="32" cy="30" r="1.3" fill="#78350F" />
        <circle cx="30" cy="34" r="1.3" fill="#78350F" />
        {/* Glazed Ring Donut in Foreground */}
        <ellipse cx="44" cy="43" rx="12" ry="8" fill="#FBBF24" />
        <ellipse cx="44" cy="41" rx="10.5" ry="6.5" fill="url(#donut_icing)" />
        <ellipse cx="44" cy="41" rx="4" ry="2.5" fill="#FFFFFF" />
        {/* Sprinkles */}
        <rect x="40" y="38" width="2" height="1" fill="#FFFFFF" rx="0.5" transform="rotate(30 40 38)" />
        <rect x="46" y="37" width="2" height="1" fill="#67E8F9" rx="0.5" transform="rotate(-20 46 37)" />
        <rect x="43" y="44" width="2" height="1" fill="#FDE047" rx="0.5" transform="rotate(45 43 44)" />
      </svg>
    );
  }

  // 8. Drinks & Smoothies (Frosty Chapman mocktail with cucumber, lime & straw)
  if (key === 'drinks-beverages' || key === 'drinks' || key === 'beverages' || key === 'smoothies') {
    return (
      <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={cn('select-none drop-shadow-sm', className)}>
        <defs>
          <linearGradient id="glass" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.7" />
            <stop offset="25%" stopColor="#E2E8F0" stopOpacity="0.3" />
            <stop offset="75%" stopColor="#E2E8F0" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.8" />
          </linearGradient>
          <linearGradient id="chapman" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#EF4444" />
            <stop offset="50%" stopColor="#DC2626" />
            <stop offset="100%" stopColor="#991B1B" />
          </linearGradient>
          <linearGradient id="straw" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#F97316" />
            <stop offset="100%" stopColor="#FBBF24" />
          </linearGradient>
        </defs>
        <ellipse cx="32" cy="58" rx="14" ry="3" fill="#000000" fillOpacity="0.14" />
        {/* Straw */}
        <line x1="42" y1="8" x2="28" y2="44" stroke="url(#straw)" strokeWidth="4" strokeLinecap="round" />
        {/* Glass Base & Body */}
        <path d="M20 22L24 53C24 55 40 55 40 53L44 22Z" fill="url(#chapman)" />
        <path d="M19 20L23 54C23 56 41 56 41 54L45 20Z" fill="url(#glass)" stroke="#CBD5E1" strokeWidth="1.2" />
        {/* Floating Ice Cubes */}
        <rect x="25" y="26" width="6" height="6" rx="1.5" fill="#FFFFFF" fillOpacity="0.5" />
        <rect x="33" y="32" width="6" height="6" rx="1.5" fill="#FFFFFF" fillOpacity="0.5" />
        {/* Cucumber / Lime Slices on Rim */}
        <circle cx="21" cy="20" r="6" fill="#22C55E" stroke="#15803D" strokeWidth="1" />
        <circle cx="21" cy="20" r="4.5" fill="#86EFAC" />
        {/* Bubbles & Condensation Drops */}
        <circle cx="26" cy="42" r="1.2" fill="#FFFFFF" fillOpacity="0.8" />
        <circle cx="34" cy="46" r="1" fill="#FFFFFF" fillOpacity="0.8" />
        <circle cx="31" cy="38" r="1.4" fill="#FFFFFF" fillOpacity="0.8" />
      </svg>
    );
  }

  // 9. Breakfast & Café (Golden pancake stack with melting butter & streaming coffee)
  if (key === 'breakfast-cafe' || key === 'breakfast' || key === 'cafe') {
    return (
      <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={cn('select-none drop-shadow-sm', className)}>
        <defs>
          <radialGradient id="pancake" cx="50%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#FEF08A" />
            <stop offset="60%" stopColor="#F59E0B" />
            <stop offset="100%" stopColor="#B45309" />
          </radialGradient>
        </defs>
        <ellipse cx="32" cy="56" rx="20" ry="3.5" fill="#000000" fillOpacity="0.14" />
        {/* Plate */}
        <ellipse cx="32" cy="48" rx="22" ry="8" fill="#F8FAFC" stroke="#E2E8F0" strokeWidth="1.5" />
        {/* Pancake Stack */}
        <ellipse cx="32" cy="44" rx="17" ry="5.5" fill="url(#pancake)" />
        <ellipse cx="32" cy="38" rx="16" ry="5.2" fill="url(#pancake)" />
        <ellipse cx="32" cy="32" rx="15" ry="5" fill="url(#pancake)" />
        {/* Melting Butter Pat */}
        <rect x="29" y="27" width="6" height="4" rx="1" fill="#FDE047" stroke="#EAB308" strokeWidth="0.8" />
        {/* Dripping Amber Maple Syrup */}
        <path d="M32 32C32 36 34 37 34 42" stroke="#B45309" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M28 33C28 35 27 36 27 39" stroke="#B45309" strokeWidth="2" strokeLinecap="round" />
        {/* Sunny Side Egg */}
        <ellipse cx="44" cy="44" rx="6" ry="4" fill="#FFFFFF" />
        <circle cx="44" cy="44" r="2.5" fill="#F59E0B" />
      </svg>
    );
  }

  // 10. Salads & Healthy (Crisp garden salad with fresh avocado fan, greens & tomato)
  if (key === 'healthy-salads' || key === 'salads' || key === 'healthy') {
    return (
      <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={cn('select-none drop-shadow-sm', className)}>
        <defs>
          <radialGradient id="salad_bowl" cx="50%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#78350F" />
            <stop offset="60%" stopColor="#451A03" />
            <stop offset="100%" stopColor="#290E02" />
          </radialGradient>
        </defs>
        <ellipse cx="32" cy="56" rx="18" ry="3.5" fill="#000000" fillOpacity="0.14" />
        {/* Wooden Bowl */}
        <path d="M14 30C14 46 22 50 32 50C42 50 50 46 50 30Z" fill="url(#salad_bowl)" />
        <ellipse cx="32" cy="30" rx="18" ry="6" fill="#582106" />
        {/* Fresh Crisp Greens */}
        <circle cx="28" cy="26" r="6" fill="#22C55E" />
        <circle cx="36" cy="24" r="7" fill="#16A34A" />
        <circle cx="42" cy="27" r="5" fill="#4ADE80" />
        {/* Avocado Slices */}
        <path d="M22 28C22 24 26 22 28 25C26 28 24 30 22 28Z" fill="#84CC16" stroke="#4D7C0F" strokeWidth="0.8" />
        <path d="M25 31C25 27 29 25 31 28C29 31 27 33 25 31Z" fill="#A3E635" />
        {/* Cherry Tomatoes */}
        <circle cx="38" cy="29" r="3" fill="#EF4444" />
        <circle cx="32" cy="27" r="2.5" fill="#DC2626" />
        <circle cx="30" cy="21" r="1.2" fill="#FFFFFF" fillOpacity="0.8" />
      </svg>
    );
  }

  // 11. Local & African Classics (Native pot with catfish peppersoup & roasted bole plantain)
  if (key === 'local-specialties' || key === 'local' || key === 'specialties') {
    return (
      <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={cn('select-none drop-shadow-sm', className)}>
        <defs>
          <radialGradient id="native_pot" cx="45%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#475569" />
            <stop offset="60%" stopColor="#1E293B" />
            <stop offset="100%" stopColor="#0F172A" />
          </radialGradient>
          <radialGradient id="bole" cx="50%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#F59E0B" />
            <stop offset="60%" stopColor="#B45309" />
            <stop offset="100%" stopColor="#451A03" />
          </radialGradient>
        </defs>
        <ellipse cx="32" cy="56" rx="19" ry="3.5" fill="#000000" fillOpacity="0.14" />
        {/* Native Clay Pot */}
        <ellipse cx="26" cy="38" rx="14" ry="12" fill="url(#native_pot)" />
        <ellipse cx="26" cy="28" rx="10" ry="3.5" fill="#0F172A" />
        <ellipse cx="26" cy="28" rx="8.5" ry="2.5" fill="#991B1B" />
        <circle cx="28" cy="28" r="1.5" fill="#16A34A" />
        {/* Roasted Bole (Plantain) with Charred Grill Marks */}
        <path d="M34 46C38 32 46 22 52 24C56 26 50 42 42 50C38 52 34 50 34 46Z" fill="url(#bole)" />
        <line x1="42" y1="32" x2="48" y2="34" stroke="#1C1917" strokeWidth="2" strokeLinecap="round" />
        <line x1="39" y1="39" x2="45" y2="41" stroke="#1C1917" strokeWidth="2" strokeLinecap="round" />
        <line x1="36" y1="45" x2="41" y2="47" stroke="#1C1917" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }

  // 12. All Cuisines / Gourmet Cloche (Silver dining cloche with golden handle and feast aroma)
  if (key === 'all' || key === 'all cuisines' || key === 'all-cuisines' || key === 'feast' || key === 'food') {
    return (
      <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={cn('select-none drop-shadow-sm', className)}>
        <defs>
          <linearGradient id="cloche_silver" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="30%" stopColor="#E2E8F0" />
            <stop offset="70%" stopColor="#94A3B8" />
            <stop offset="100%" stopColor="#475569" />
          </linearGradient>
          <linearGradient id="gold_knob" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#FEF08A" />
            <stop offset="50%" stopColor="#F59E0B" />
            <stop offset="100%" stopColor="#B45309" />
          </linearGradient>
        </defs>
        <ellipse cx="32" cy="56" rx="22" ry="4" fill="#000000" fillOpacity="0.14" />
        {/* Silver Tray Base */}
        <ellipse cx="32" cy="46" rx="24" ry="7" fill="url(#cloche_silver)" />
        <ellipse cx="32" cy="45" rx="22" ry="5.5" fill="#F8FAFC" />
        {/* Dome Cover */}
        <path d="M14 44C14 26 22 20 32 20C42 20 50 26 50 44Z" fill="url(#cloche_silver)" />
        <ellipse cx="32" cy="44" rx="18" ry="4" fill="#64748B" />
        {/* Specular Highlight Streak */}
        <path d="M26 24C24 30 23 38 23 42" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" opacity="0.75" />
        {/* Gold Handle Knob */}
        <circle cx="32" cy="18" r="3.5" fill="url(#gold_knob)" />
        <rect x="31" y="20" width="2" height="2" fill="#B45309" />
      </svg>
    );
  }

  // 13. Market: Fresh Produce (Harvest basket of ripe tomatoes, peppers & greens)
  if (key === 'food & market' || key === 'produce' || key === 'market produce' || key === 'market-produce') {
    return (
      <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={cn('select-none drop-shadow-sm', className)}>
        <defs>
          <radialGradient id="basket" cx="50%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#D97706" />
            <stop offset="60%" stopColor="#92400E" />
            <stop offset="100%" stopColor="#451A03" />
          </radialGradient>
        </defs>
        <ellipse cx="32" cy="56" rx="18" ry="3.5" fill="#000000" fillOpacity="0.14" />
        {/* Woven Basket */}
        <path d="M16 36L20 50C21 52 43 52 44 50L48 36Z" fill="url(#basket)" />
        <ellipse cx="32" cy="36" rx="16" ry="4" fill="#78350F" />
        {/* Fresh Harvest Tomatoes & Peppers */}
        <circle cx="27" cy="30" r="6" fill="#EF4444" />
        <circle cx="37" cy="30" r="6.5" fill="#DC2626" />
        <circle cx="32" cy="34" r="5.5" fill="#F97316" />
        {/* Leafy Green Tops */}
        <path d="M26 24C28 20 32 21 33 24" stroke="#16A34A" strokeWidth="2" strokeLinecap="round" />
        <path d="M36 23C38 19 42 20 41 24" stroke="#15803D" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }

  // 14. Market: Groceries / Supermarket (Milk carton & breakfast cereal)
  if (key === 'groceries' || key === 'supermarket' || key === 'pantry') {
    return (
      <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={cn('select-none drop-shadow-sm', className)}>
        <defs>
          <linearGradient id="milk_carton" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#60A5FA" />
            <stop offset="100%" stopColor="#1E40AF" />
          </linearGradient>
          <linearGradient id="cereal_box" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#F59E0B" />
            <stop offset="100%" stopColor="#B45309" />
          </linearGradient>
        </defs>
        <ellipse cx="32" cy="56" rx="18" ry="3.5" fill="#000000" fillOpacity="0.14" />
        {/* Cereal Box */}
        <rect x="28" y="16" width="22" height="34" rx="2" fill="url(#cereal_box)" />
        <rect x="32" y="22" width="14" height="12" rx="1.5" fill="#FEF3C7" />
        {/* Milk Carton */}
        <path d="M14 26L20 18L26 26V50H14Z" fill="url(#milk_carton)" />
        <rect x="14" y="26" width="12" height="24" fill="#FFFFFF" fillOpacity="0.85" />
        <circle cx="20" cy="38" r="3" fill="#2563EB" />
      </svg>
    );
  }

  // 15. Market: Pharmacy & Health (Medicine bottle & vitamin capsules)
  if (key === 'pharmacy' || key === 'health & pharmacy' || key === 'medicine') {
    return (
      <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={cn('select-none drop-shadow-sm', className)}>
        <defs>
          <linearGradient id="bottle" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#38BDF8" />
            <stop offset="100%" stopColor="#0284C7" />
          </linearGradient>
        </defs>
        <ellipse cx="32" cy="56" rx="16" ry="3" fill="#000000" fillOpacity="0.14" />
        {/* Prescription Bottle */}
        <rect x="18" y="22" width="18" height="28" rx="3" fill="url(#bottle)" />
        <rect x="20" y="17" width="14" height="5" rx="1" fill="#F8FAFC" />
        <rect x="22" y="30" width="10" height="12" rx="1" fill="#FFFFFF" />
        {/* Red & White Capsule */}
        <g transform="rotate(35 44 38)">
          <rect x="38" y="32" width="12" height="6" rx="3" fill="#EF4444" />
          <rect x="44" y="32" width="6" height="6" rx="0" fill="#FFFFFF" />
          <path d="M47 32C48.6 32 50 33.3 50 35C50 36.7 48.6 38 47 38Z" fill="#FFFFFF" />
        </g>
      </svg>
    );
  }

  // 16. Market: Fashion & Wear
  if (key === 'fashion' || key === 'fashion & wear' || key === 'clothing') {
    return (
      <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={cn('select-none drop-shadow-sm', className)}>
        <defs>
          <linearGradient id="polo" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#10B981" />
            <stop offset="100%" stopColor="#047857" />
          </linearGradient>
        </defs>
        <ellipse cx="32" cy="56" rx="18" ry="3.5" fill="#000000" fillOpacity="0.14" />
        <path d="M22 18L32 24L42 18L48 24L44 30L40 28V50H24V28L20 30L16 24Z" fill="url(#polo)" />
        <path d="M28 18L32 24L36 18" stroke="#FFFFFF" strokeWidth="1.5" />
        <circle cx="32" cy="30" r="1" fill="#FFFFFF" />
      </svg>
    );
  }

  // 17. Market: Electronics & Tech
  if (key === 'electronics' || key === 'tech & gadgets' || key === 'tech') {
    return (
      <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={cn('select-none drop-shadow-sm', className)}>
        <defs>
          <linearGradient id="phone" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#334155" />
            <stop offset="100%" stopColor="#0F172A" />
          </linearGradient>
          <linearGradient id="screen" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#38BDF8" />
            <stop offset="100%" stopColor="#6366F1" />
          </linearGradient>
        </defs>
        <ellipse cx="32" cy="56" rx="16" ry="3" fill="#000000" fillOpacity="0.14" />
        {/* Smartphone */}
        <rect x="20" y="14" width="24" height="40" rx="4" fill="url(#phone)" />
        <rect x="22" y="17" width="20" height="34" rx="2" fill="url(#screen)" />
        <circle cx="32" cy="15.5" r="0.8" fill="#94A3B8" />
      </svg>
    );
  }

  // 18. Home Portal: Stay / Hotels
  if (key === 'stay' || key === 'stays' || key === 'hotels' || key === 'hotel') {
    return (
      <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={cn('select-none drop-shadow-sm', className)}>
        <defs>
          <linearGradient id="villa" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#F8FAFC" />
            <stop offset="100%" stopColor="#CBD5E1" />
          </linearGradient>
          <linearGradient id="pool" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#38BDF8" />
            <stop offset="100%" stopColor="#0284C7" />
          </linearGradient>
        </defs>
        <ellipse cx="32" cy="56" rx="20" ry="3.5" fill="#000000" fillOpacity="0.14" />
        {/* Boutique Villa Structure */}
        <rect x="18" y="20" width="28" height="26" rx="2" fill="url(#villa)" stroke="#94A3B8" strokeWidth="1" />
        <rect x="22" y="24" width="8" height="8" rx="1" fill="#38BDF8" fillOpacity="0.8" />
        <rect x="34" y="24" width="8" height="8" rx="1" fill="#38BDF8" fillOpacity="0.8" />
        <rect x="28" y="36" width="8" height="10" rx="1" fill="#92400E" />
        {/* Sapphire Pool in Foreground */}
        <ellipse cx="32" cy="50" rx="16" ry="5" fill="url(#pool)" />
      </svg>
    );
  }

  // 19. Home Portal: Services & Artisans
  if (key === 'services' || key === 'service' || key === 'artisans') {
    return (
      <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={cn('select-none drop-shadow-sm', className)}>
        <defs>
          <linearGradient id="toolbox" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#DC2626" />
            <stop offset="100%" stopColor="#991B1B" />
          </linearGradient>
          <linearGradient id="wrench" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#E2E8F0" />
            <stop offset="100%" stopColor="#64748B" />
          </linearGradient>
        </defs>
        <ellipse cx="32" cy="56" rx="18" ry="3.5" fill="#000000" fillOpacity="0.14" />
        {/* Metal Toolbox */}
        <rect x="16" y="28" width="32" height="22" rx="3" fill="url(#toolbox)" />
        <rect x="26" y="22" width="12" height="6" rx="2" stroke="#475569" strokeWidth="2.5" fill="none" />
        {/* Chrome Adjustable Wrench */}
        <path d="M22 22L42 42" stroke="url(#wrench)" strokeWidth="4.5" strokeLinecap="round" />
        <circle cx="22" cy="22" r="5" stroke="url(#wrench)" strokeWidth="3" fill="none" />
      </svg>
    );
  }

  // 20. Home Portal: Events
  if (key === 'events' || key === 'event' || key === 'tickets') {
    return (
      <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={cn('select-none drop-shadow-sm', className)}>
        <defs>
          <linearGradient id="ticket" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#A855F7" />
            <stop offset="100%" stopColor="#6B21A8" />
          </linearGradient>
        </defs>
        <ellipse cx="32" cy="56" rx="18" ry="3.5" fill="#000000" fillOpacity="0.14" />
        {/* Holographic VIP Ticket */}
        <g transform="rotate(-15 32 32)">
          <rect x="16" y="24" width="32" height="18" rx="3" fill="url(#ticket)" />
          <circle cx="16" cy="33" r="3" fill="#FAFAFA" />
          <circle cx="48" cy="33" r="3" fill="#FAFAFA" />
          <line x1="28" y1="24" x2="28" y2="42" stroke="#FFFFFF" strokeWidth="1.5" strokeDasharray="2 2" opacity="0.6" />
          <circle cx="38" cy="33" r="3" fill="#FDE047" />
        </g>
      </svg>
    );
  }

  // 21. Home Portal: Jobs
  if (key === 'jobs' || key === 'job' || key === 'careers') {
    return (
      <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={cn('select-none drop-shadow-sm', className)}>
        <defs>
          <linearGradient id="briefcase" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#78350F" />
            <stop offset="100%" stopColor="#451A03" />
          </linearGradient>
        </defs>
        <ellipse cx="32" cy="56" rx="18" ry="3.5" fill="#000000" fillOpacity="0.14" />
        {/* Executive Leather Briefcase */}
        <rect x="16" y="24" width="32" height="24" rx="3" fill="url(#briefcase)" />
        <rect x="26" y="18" width="12" height="6" rx="2" stroke="#D97706" strokeWidth="2.5" fill="none" />
        <rect x="23" y="32" width="3" height="4" rx="0.5" fill="#FDE047" />
        <rect x="38" y="32" width="3" height="4" rx="0.5" fill="#FDE047" />
      </svg>
    );
  }

  // 22. Home Portal: Explore & Compass
  if (key === 'explore' || key === 'compass' || key === 'map') {
    return (
      <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={cn('select-none drop-shadow-sm', className)}>
        <defs>
          <radialGradient id="compass_brass" cx="45%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#FDE68A" />
            <stop offset="60%" stopColor="#F59E0B" />
            <stop offset="100%" stopColor="#B45309" />
          </radialGradient>
        </defs>
        <ellipse cx="32" cy="56" rx="18" ry="3.5" fill="#000000" fillOpacity="0.14" />
        {/* 3D Brass Compass */}
        <circle cx="32" cy="32" r="18" fill="url(#compass_brass)" stroke="#78350F" strokeWidth="1.5" />
        <circle cx="32" cy="32" r="14" fill="#0F172A" />
        {/* Compass Needle */}
        <polygon points="32,20 35,32 32,30" fill="#EF4444" />
        <polygon points="32,44 35,32 32,30" fill="#E2E8F0" />
        <circle cx="32" cy="32" r="2.5" fill="#FDE047" />
      </svg>
    );
  }

  // 23. Home Portal: Shop / Retail
  if (key === 'shop' || key === 'market') {
    return (
      <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={cn('select-none drop-shadow-sm', className)}>
        <defs>
          <linearGradient id="bag" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#FB7185" />
            <stop offset="100%" stopColor="#E11D48" />
          </linearGradient>
        </defs>
        <ellipse cx="32" cy="56" rx="18" ry="3.5" fill="#000000" fillOpacity="0.14" />
        {/* 3D Coral Retail Shopping Bag */}
        <path d="M18 26L22 52H42L46 26Z" fill="url(#bag)" />
        <path d="M26 26V20C26 16.7 28.7 14 32 14C35.3 14 38 16.7 38 20V26" stroke="#FDA4AF" strokeWidth="3" strokeLinecap="round" fill="none" />
        {/* Tissue Paper Peeking Out */}
        <path d="M24 26L30 18L36 26" fill="#FFFFFF" fillOpacity="0.8" />
      </svg>
    );
  }

  // Default Fallback
  if (fallback) {
    if (typeof fallback === 'string') {
      return (
        <span className={cn('text-2xl select-none', className)} role="img" aria-label={name}>
          {fallback}
        </span>
      );
    }
    return <span className={className}>{fallback}</span>;
  }

  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={cn('select-none drop-shadow-sm', className)}>
      <ellipse cx="32" cy="56" rx="18" ry="3.5" fill="#000000" fillOpacity="0.12" />
      <circle cx="32" cy="32" r="18" fill="#F1F5F9" stroke="#CBD5E1" strokeWidth="1.5" />
      <circle cx="32" cy="32" r="10" fill="#E2E8F0" />
    </svg>
  );
}
