import { MissionDef } from './types';

export const MISSIONS: MissionDef[] = [
  {
    id: 'monsoon-express',
    title: 'Monsoon Express',
    giver: 'Rohan Deshmukh',
    category: 'Main Story',
    description:
      'Race an urgent shipping ledger from Purana Bazaar across Marine Promenade onto the Navpur Sea Link Pier before the harbor customs launch departs.',
    reward: 35000,
    timeLimitSec: 95,
    requireVehicle: true,
    checkpoints: [
      { x: 0, z: -75, label: 'Cross Purana Bazaar Archway', radius: 11 },
      { x: 75, z: -75, label: 'Merge onto Marine Drive North', radius: 11 },
      { x: 75, z: 75, label: 'Sweep Queen’s Necklace Promenade', radius: 11 },
      { x: 184, z: 0, label: 'Deliver Ledger at Sea Link Pier', radius: 12 },
    ],
    introDialogue:
      'Rohan Deshmukh: "Monsoon clouds are building over the bay. Take a fast ride down Marine Drive and get that ledger onto the launch at Sea Link Pier!"',
    completeDialogue:
      'Rohan Deshmukh: "Brilliant driving! The freighter cleared harbor and ₹35,000 is credited to your account."',
  },
  {
    id: 'auto-hustle',
    title: 'Purana Bazaar Auto Hustle',
    giver: 'Vikram Sethi',
    category: 'Auto Hustle',
    description:
      'Weave through Navpur’s busy streets—ideally in your Auto-Rickshaw or Bullet 350—to complete four rapid bazaar courier drops ending at Navpur Auto Works.',
    reward: 24000,
    timeLimitSec: 90,
    requireVehicle: true,
    checkpoints: [
      { x: -37, z: -75, label: 'Pick Up Spices at Purana Bazaar', radius: 11 },
      { x: 75, z: 0, label: 'Drop Parcel at Marine Promenade', radius: 11 },
      { x: 0, z: 150, label: 'Expressway Ring South Interchange', radius: 11 },
      { x: -36, z: 36, label: 'Finish at Navpur Auto Works', radius: 12 },
    ],
    introDialogue:
      'Vikram Sethi: "Rush hour in Purana Bazaar! Zip through the intersections, dodge the Kaali-Peelis, and bring the final drop back to Navpur Auto Works."',
    completeDialogue:
      'Vikram Sethi: "Fastest meter in Navpur! ₹24,000 transferred—swing by Auto Works anytime to respray or upgrade your fleet."',
  },
  {
    id: 'highway-breakout',
    title: 'NH-48 PCR Breakout',
    giver: 'Ananya Rao',
    category: 'Law Evasion',
    description:
      'Navpur Police PCR units flagged your plates near Civic HQ. Outrun the interceptors along the Expressway Ring and slip back into Indira Enclave Safehouse.',
    reward: 48000,
    triggerWanted: 2,
    checkpoints: [
      { x: -150, z: -75, label: 'Hit NH-48 West Expressway', radius: 12 },
      { x: -150, z: 150, label: 'Cut Through Kurla Industrial Yard', radius: 12 },
      { x: 42, z: -36, label: 'Reach Indira Enclave Safehouse', radius: 11 },
    ],
    introDialogue:
      'Ananya Rao: "PCR jeeps just lit up their strobes! Floor it onto the Expressway Ring, break their line of sight, and lay low at Indira Enclave."',
    completeDialogue:
      'Ananya Rao: "Control room lost your trail in the haze. Here is ₹48,000—grab some cutting chai and let the heat cool off."',
  },
  {
    id: 'navpur-darshan',
    title: 'Navpur Coastal Darshan',
    giver: 'Navpur Heritage Guild',
    category: 'Exploration',
    description:
      'Explore four signature landmarks across the metropolis on foot or by vehicle: Heritage Plaza Fountain, Chowpatty Chai Lounge, Sea Link Pier, and Navpur Lighthouse.',
    reward: 18000,
    checkpoints: [
      { x: -37, z: -22, label: 'Visit Heritage Chowk Fountain', radius: 12 },
      { x: 98, z: 48, label: 'Stop at Chowpatty Chai Terrace', radius: 11 },
      { x: 175, z: 0, label: 'Explore Navpur Sea Link Pier', radius: 12 },
      { x: 150, z: 150, label: 'Reach Navpur Cape Lighthouse', radius: 16 },
    ],
    introDialogue:
      'Navpur Heritage Guild: "Discover the spirit of Navpur from Purana Bazaar to the Queen’s Necklace. Visit all four landmarks for a ₹18,000 bonus."',
    completeDialogue:
      'Navpur Heritage Guild: "All four landmarks documented! ₹18,000 has been added to your balance."',
  },
];
