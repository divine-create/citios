'use client';

import React, { useState } from 'react';
import { 
  UtensilsCrossed, Check, ArrowRight, ArrowLeft, Sparkles, AlertCircle, 
  Clock, MapPin, Phone, MessageSquare, Globe, Plus, Trash2, Flame, Award
} from 'lucide-react';
import { createHQManagedBusiness, CreateHQManagedBusinessPayload } from '@/lib/actions/hq-managed-business';
import { getCityAreas } from '@/lib/city-areas';
import MediaLinkOrUploadInput from '../MediaLinkOrUploadInput';

interface RestaurantCreationWizardProps {
  onSuccess: () => void;
  onCancel: () => void;
}

const DINING_CONCEPTS = [
  'Fast Casual & Quick Bites',
  'Native Calabar Bukka & Local Delicacy',
  'Fine Dining & Continental Grill',
  'Rooftop Lounge & Cocktail Bar',
  'Cafe, Bakery & Confectionery',
  'Seafood & Fish Specialist',
];

const CUISINE_SPECIALTIES = [
  'Calabar Native Soups (Afang, Edikang Ikong)',
  'Smoky Nigerian Party Jollof & Fried Rice',
  'Charcoal Grills, Suya & BBQ',
  'Pastries, Shawarma & Meatpies',
  'Catfish & Goat Meat Pepper Soup',
  'Cocktails, Mocktails & Chilled Drinks',
];

export default function RestaurantCreationWizard({ onSuccess, onCancel }: RestaurantCreationWizardProps) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [diningConcept, setDiningConcept] = useState('Fast Casual & Quick Bites');
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([
    'Calabar Native Soups (Afang, Edikang Ikong)',
    'Smoky Nigerian Party Jollof & Fried Rice',
  ]);
  const [dineIn, setDineIn] = useState(true);
  const [takeaway, setTakeaway] = useState(true);
  const [delivery, setDelivery] = useState(true);
  const [prepTime, setPrepTime] = useState('15 - 25 mins');
  const [priceTier, setPriceTier] = useState<'₦' | '₦₦' | '₦₦₦'>('₦₦');
  const [description, setDescription] = useState('');

  // Location & Contacts
  const [address, setAddress] = useState('');
  const [area, setArea] = useState('Marian Road & Environs');
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [website, setWebsite] = useState('');
  const [operatingHours, setOperatingHours] = useState('Mon - Sun: 8:00 AM - 10:30 PM');
  const [latitude, setLatitude] = useState<number>(4.9757);
  const [longitude, setLongitude] = useState<number>(8.3417);

  // Media
  const [logoUrl, setLogoUrl] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [videoUrl, setVideoUrl] = useState('');

  // Menu items
  const [bulkText, setBulkText] = useState('');
  const [dishes, setDishes] = useState<Array<{
    name: string;
    category: string;
    price: number;
    description: string;
    isSpicy?: boolean;
    isChefSpecial?: boolean;
  }>>([
    { name: 'Afang Soup & Pounded Yam', category: 'Native Soups', price: 3500, description: 'Rich native vegetable soup with goat meat and stockfish', isChefSpecial: true },
    { name: 'Jollof Rice & Crispy Chicken', category: 'Rice & Grills', price: 2800, description: 'Smoky firewood party jollof with spicy drumstick' },
  ]);

  // Dish adder
  const [newDishName, setNewDishName] = useState('');
  const [newDishCategory, setNewDishCategory] = useState('Native Soups');
  const [newDishPrice, setNewDishPrice] = useState('');
  const [newDishDesc, setNewDishDesc] = useState('');

  const toggleSpecialty = (item: string) => {
    setSelectedSpecialties(prev => 
      prev.includes(item) ? prev.filter(s => s !== item) : [...prev, item]
    );
  };

  const handleParseBulkMenu = () => {
    if (!bulkText.trim()) return;
    const lines = bulkText.split('\n').map(l => l.trim()).filter(Boolean);
    const parsed: typeof dishes = [];

    for (const line of lines) {
      const parts = line.split(/[-–:]/).map(p => p.trim());
      if (parts.length >= 2) {
        const dName = parts[0];
        const priceNum = parts[1].replace(/,/g, '').match(/\d+/);
        const price = priceNum ? Number(priceNum[0]) : 0;
        const dDesc = parts[2] || '';
        parsed.push({
          name: dName,
          category: 'Native Soups',
          price,
          description: dDesc,
        });
      }
    }

    if (parsed.length > 0) {
      setDishes(prev => [...prev, ...parsed]);
      setBulkText('');
    }
  };

  const handleAddSingleDish = () => {
    if (!newDishName.trim()) return;
    const price = Number(newDishPrice) || 0;
    setDishes(prev => [
      ...prev,
      {
        name: newDishName.trim(),
        category: newDishCategory,
        price,
        description: newDishDesc.trim(),
      }
    ]);
    setNewDishName('');
    setNewDishPrice('');
    setNewDishDesc('');
  };

  const handleRemoveDish = (index: number) => {
    setDishes(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleSubmit = async () => {
    setError(null);
    if (!name.trim()) {
      setError('Restaurant name is required.');
      setStep(1);
      return;
    }
    if (!address.trim()) {
      setError('Physical restaurant address is required.');
      setStep(2);
      return;
    }

    try {
      setIsSubmitting(true);
      const diningOptions: string[] = [];
      if (dineIn) diningOptions.push('Dine-in');
      if (takeaway) diningOptions.push('Takeaway');
      if (delivery) diningOptions.push('Delivery');

      const payload: CreateHQManagedBusinessPayload = {
        name: name.trim(),
        type: 'RESTAURANT',
        storeCategory: diningConcept,
        description: description.trim() || `${name} offers authentic dining in Calabar. Specializing in ${selectedSpecialties.slice(0, 2).join(', ')}.`,
        address: address.trim(),
        area: area.trim(),
        latitude,
        longitude,
        phone: phone.trim(),
        whatsapp: whatsapp.trim(),
        website: website.trim(),
        logoUrl: logoUrl.trim(),
        coverUrl: coverUrl.trim(),
        videos: videoUrl.trim() ? [videoUrl.trim()] : [],
        cuisineType: diningConcept,
        diningOptions,
        operatingHours: operatingHours.trim(),
        amenities: selectedSpecialties,
        initialItems: dishes.map(d => ({
          name: d.name,
          category: d.category,
          price: d.price,
          description: d.description,
        })),
      };

      const res = await createHQManagedBusiness(payload);
      if (res.success) {
        onSuccess();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to onboard restaurant');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col min-h-full">
      {/* Step Indicators (Sticky top of wizard) */}
      <div className="sticky top-0 z-10 bg-slate-900/95 backdrop-blur-md px-6 py-3 border-b border-slate-800 flex items-center justify-between text-xs shrink-0 overflow-x-auto scrollbar-none">
        <div className="flex items-center justify-between w-full min-w-max gap-4">
          {[
            { s: 1, title: '1. Restaurant Profile' },
            { s: 2, title: '2. Location & Dispatch' },
            { s: 3, title: '3. Food Media' },
            { s: 4, title: '4. Menu & Pricing' },
          ].map(({ s, title }) => (
            <button
              key={s}
              onClick={() => setStep(s as any)}
              className={`font-bold pb-1 flex items-center gap-1.5 transition-all ${
                step === s 
                  ? 'text-amber-400 border-b-2 border-amber-400' 
                  : step > s 
                  ? 'text-emerald-400' 
                  : 'text-slate-500 hover:text-slate-400'
              }`}
            >
              {step > s ? <Check size={14} /> : null}
              {title}
            </button>
          ))}
        </div>
      </div>

      <div className="p-6 space-y-6 flex-1 text-slate-100">
        {error && (
          <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        {/* STEP 1: Restaurant Profile */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
              Restaurant Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Freddy's Restaurant & Grill, Crunchies Fried Chicken, Calabar Delicacy Bukka"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full text-sm font-bold px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder:text-slate-600 focus:outline-none focus:border-amber-400"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
              Dining Concept & Ambience
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {DINING_CONCEPTS.map((concept) => (
                <button
                  key={concept}
                  type="button"
                  onClick={() => setDiningConcept(concept)}
                  className={`p-3 rounded-xl border text-xs font-bold text-left transition-all ${
                    diningConcept === concept
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/60 shadow-sm'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                  }`}
                >
                  {concept}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
              Signature Cuisine Specialties (Select all that apply)
            </label>
            <div className="flex flex-wrap gap-2">
              {CUISINE_SPECIALTIES.map((spec) => {
                const isSelected = selectedSpecialties.includes(spec);
                return (
                  <button
                    key={spec}
                    type="button"
                    onClick={() => toggleSpecialty(spec)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                      isSelected
                        ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-850 hover:text-white'
                    }`}
                  >
                    {isSelected ? '✓ ' : '+ '} {spec}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-2xl bg-slate-950/70 border border-slate-800">
            <div>
              <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Dining Modes</span>
              <div className="space-y-1.5 text-xs text-slate-300 font-medium">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={dineIn} onChange={(e) => setDineIn(e.target.checked)} className="rounded bg-slate-900 border-slate-700 text-amber-500 focus:ring-amber-500" />
                  <span>Dine-in Tables</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={takeaway} onChange={(e) => setTakeaway(e.target.checked)} className="rounded bg-slate-900 border-slate-700 text-amber-500 focus:ring-amber-500" />
                  <span>Takeaway / Pick-up</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={delivery} onChange={(e) => setDelivery(e.target.checked)} className="rounded bg-slate-900 border-slate-700 text-amber-500 focus:ring-amber-500" />
                  <span>9jaLive Delivery</span>
                </label>
              </div>
            </div>

            <div>
              <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Avg Kitchen Prep</span>
              <input
                type="text"
                placeholder="e.g. 15 - 25 mins"
                value={prepTime}
                onChange={(e) => setPrepTime(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder:text-slate-600 focus:outline-none focus:border-amber-400"
              />
            </div>

            <div>
              <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Price Range</span>
              <div className="flex gap-2">
                {(['₦', '₦₦', '₦₦₦'] as const).map((tier) => (
                  <button
                    key={tier}
                    type="button"
                    onClick={() => setPriceTier(tier)}
                    className={`flex-1 py-2 rounded-xl text-xs font-black transition-all border ${
                      priceTier === tier ? 'bg-amber-500 text-slate-950 font-black border-amber-400' : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    {tier}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
              Restaurant Backstory & Ambiance
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Calabar's premier dining destination for smoky grills, chilled palmwine, and native delicacies..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full text-xs p-3 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder:text-slate-600 focus:outline-none focus:border-amber-400"
            />
          </div>
        </div>
      )}

      {/* STEP 2: Location & Kitchen Dispatch Contacts */}
      {step === 2 && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                City Area / District *
              </label>
              <select
                value={area}
                onChange={(e) => setArea(e.target.value)}
                className="w-full text-xs px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder:text-slate-600 focus:outline-none focus:border-amber-400 font-semibold"
              >
                {getCityAreas('calabar').map((a) => (
                  <option key={a.id} value={a.name}>{a.name}</option>
                ))}
                <option value="Other Area">Other Area / Landmark</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                Street Address & Landmark *
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  required
                  placeholder="e.g. 90 Marian Road, Near Lion Bank"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full text-xs pl-10 pr-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder:text-slate-600 focus:outline-none focus:border-amber-400 font-medium"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                Customer Telephone Line
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                <input
                  type="tel"
                  placeholder="e.g. 08031234567"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full text-xs pl-10 pr-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder:text-slate-600 focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center justify-between">
                <span>Kitchen WhatsApp Dispatch Line *</span>
                <span className="text-[10px] text-emerald-400 font-bold">HQ Order Alerts</span>
              </label>
              <div className="relative">
                <MessageSquare className="w-4 h-4 text-emerald-400 absolute left-3.5 top-3.5" />
                <input
                  type="tel"
                  placeholder="e.g. 08123456789 (receives order dispatch)"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  className="w-full text-xs pl-10 pr-4 py-3 rounded-xl bg-slate-950 border border-emerald-500/40 text-emerald-300 placeholder:text-slate-600 focus:outline-none focus:border-emerald-400"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                Operating Hours
              </label>
              <div className="relative">
                <Clock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  placeholder="e.g. Mon - Sun: 8:00 AM - 10:30 PM"
                  value={operatingHours}
                  onChange={(e) => setOperatingHours(e.target.value)}
                  className="w-full text-xs pl-10 pr-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder:text-slate-600 focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                Website or Instagram (Optional)
              </label>
              <div className="relative">
                <Globe className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                <input
                  type="url"
                  placeholder="e.g. https://instagram.com/crunchiescalabar"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  className="w-full text-xs pl-10 pr-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder:text-slate-600 focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STEP 3: Food Photography & Storefront Media */}
      {step === 3 && (
        <div className="space-y-6">
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
              Restaurant Logo / Brand Signage
            </label>
            <p className="text-[11px] text-slate-500 mb-2">Displayed in checkout, order receipts, and search cards.</p>
            <MediaLinkOrUploadInput
              label="Logo Image"
              value={logoUrl}
              onChange={setLogoUrl}
              placeholder="Paste logo URL from their website or upload image"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
              Hero Storefront & Food Spread Banner
            </label>
            <p className="text-[11px] text-slate-500 mb-2">Wide landscape image featured at the top of the restaurant profile.</p>
            <MediaLinkOrUploadInput
              label="Storefront Cover Banner"
              value={coverUrl}
              onChange={setCoverUrl}
              placeholder="Paste high-res food photo URL or upload banner"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
              Food Ambience / Reel Video (YouTube, Vimeo, TikTok URL)
            </label>
            <p className="text-[11px] text-slate-500 mb-2">Provides residents with an immersive video preview of food and vibe.</p>
            <input
              type="url"
              placeholder="e.g. https://www.youtube.com/watch?v=sampleFoodTour"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              className="w-full text-xs px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder:text-slate-600 focus:outline-none focus:border-amber-400"
            />
          </div>
        </div>
      )}

      {/* STEP 4: Menu Seeding & Pricing */}
      {step === 4 && (
        <div className="space-y-6">
          {/* Bulk Text Parser Box */}
          <div className="p-4 rounded-2xl bg-slate-950/80 border border-amber-500/30">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles size={14} className="text-amber-400" />
                Fast Bulk Menu Parser (Text Importer)
              </span>
              <span className="text-[10px] text-slate-400 font-mono">Format: Dish - Price(₦) - Description</span>
            </div>
            <textarea
              rows={3}
              placeholder={`Peppered Goat Meat (Asun) - 2500 - Spicy tender goat meat tossed with habanero & onions
Fisherman Soup & Semo - 4000 - Premium fresh seafood broth with giant prawns and periwinkle
Smoky Jollof Rice Combo - 3200 - Served with fried plantain, moin moin and grilled chicken
Fresh Palmwine (1 Litre) - 1500 - Sweet freshly tapped Calabar palmwine`}
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
              className="w-full text-xs font-mono p-3 rounded-xl bg-slate-900 border border-slate-800 text-white placeholder:text-slate-600 focus:outline-none focus:border-amber-400"
            />
            <button
              type="button"
              onClick={handleParseBulkMenu}
              className="mt-2 text-xs bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 shadow-md shadow-amber-500/20"
            >
              <Plus size={14} /> Parse Lines into Menu
            </button>
          </div>

          {/* Add Single Dish */}
          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800">
            <span className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
              + Add Individual Dish
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
              <input
                type="text"
                placeholder="Dish Name (e.g. Afang Soup)"
                value={newDishName}
                onChange={(e) => setNewDishName(e.target.value)}
                className="text-xs p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder:text-slate-600 focus:outline-none sm:col-span-2"
              />
              <select
                value={newDishCategory}
                onChange={(e) => setNewDishCategory(e.target.value)}
                className="text-xs p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none"
              >
                <option value="Native Soups">Native Soups</option>
                <option value="Rice & Grills">Rice & Grills</option>
                <option value="Pastries & Shawarma">Pastries & Shawarma</option>
                <option value="Finger Foods & Pepper Soup">Finger Foods & Pepper Soup</option>
                <option value="Chilled Drinks & Cocktails">Chilled Drinks & Cocktails</option>
              </select>
              <input
                type="number"
                placeholder="Price (₦)"
                value={newDishPrice}
                onChange={(e) => setNewDishPrice(e.target.value)}
                className="text-xs p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder:text-slate-600 focus:outline-none"
              />
            </div>
            <div className="mt-2 flex gap-2">
              <input
                type="text"
                placeholder="Short description or ingredients (optional)"
                value={newDishDesc}
                onChange={(e) => setNewDishDesc(e.target.value)}
                className="flex-1 text-xs p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder:text-slate-600 focus:outline-none"
              />
              <button
                type="button"
                onClick={handleAddSingleDish}
                className="text-xs bg-slate-800 hover:bg-slate-750 text-white font-bold px-4 py-2 rounded-xl transition-all"
              >
                Add Dish
              </button>
            </div>
          </div>

          {/* Current Menu List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Menu Ready for Resident Orders ({dishes.length} items)
              </span>
              <span className="text-[11px] text-slate-500 font-mono">Currency: NGN (₦)</span>
            </div>

            <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
              {dishes.map((dish, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800 shadow-sm text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 font-bold text-[10px]">
                      {dish.category}
                    </span>
                    <div>
                      <span className="font-bold text-white">{dish.name}</span>
                      {dish.description && (
                        <p className="text-[11px] text-slate-400 line-clamp-1">{dish.description}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="font-mono font-bold text-emerald-400">₦{dish.price.toLocaleString()}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveDish(idx)}
                      className="p-1 text-slate-500 hover:text-red-400 transition-colors"
                      title="Remove dish"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      </div>

      {/* Footer Navigation (Sticky bottom of wizard) */}
      <div className="sticky bottom-0 z-10 bg-slate-950/95 backdrop-blur-md px-6 py-3.5 border-t border-slate-800 flex items-center justify-between shrink-0">
        {step > 1 ? (
          <button
            type="button"
            onClick={() => setStep((step - 1) as any)}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-750 flex items-center gap-1.5 transition-colors"
          >
            <ArrowLeft size={14} /> Back
          </button>
        ) : (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>
        )}

        {step < 4 ? (
          <button
            type="button"
            onClick={() => setStep((step + 1) as any)}
            className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition-all flex items-center gap-1.5 shadow-md shadow-amber-500/20"
          >
            Continue <ArrowRight size={14} />
          </button>
        ) : (
          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleSubmit}
            className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs shadow-md shadow-emerald-500/20 disabled:opacity-50 transition-all flex items-center gap-2"
          >
            {isSubmitting ? 'Onboarding Restaurant...' : 'Complete & Launch Restaurant'}
          </button>
        )}
      </div>
    </div>
  );
}
