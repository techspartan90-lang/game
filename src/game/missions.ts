import { MissionDef } from './types';

export const MISSIONS: MissionDef[] = [
  {
    id: 'coastal-delivery',
    title: 'Harbor Express',
    giver: 'Elena Vance',
    category: 'Main Story',
    description:
      'Drive down Coral Strip and deliver the encrypted harbor manifest to the yacht slip at Coral Pier before the tide gate locks.',
    reward: 2500,
    timeLimitSec: 95,
    requireVehicle: true,
    checkpoints: [
      { x: 75, z: -75, label: 'Join Ocean Boulevard North', radius: 10 },
      { x: 75, z: 75, label: 'Pass Club Solara Strip', radius: 10 },
      { x: 118, z: 0, label: 'Enter Coral Pier Timber Deck', radius: 10 },
      { x: 184, z: 0, label: 'Deliver Manifest at Yacht Slip', radius: 11 },
    ],
    introDialogue:
      'Elena Vance: "Grab a fast car and hit Ocean Boulevard. My boat is idling at the end of Coral Pier—do not miss the departure window."',
    completeDialogue:
      'Elena Vance: "Clean driving. The manifest is aboard and $2,500 just hit your account. Call me when you want real work."',
  },
  {
    id: 'midnight-sprint',
    title: 'Bayfront Circuit',
    giver: 'Marcus Cole',
    category: 'Street Run',
    description:
      'Tear through the Bayfront Financial Core intersections in a high-speed checkpoint sprint and finish at Solana Customs.',
    reward: 3200,
    timeLimitSec: 85,
    requireVehicle: true,
    checkpoints: [
      { x: 0, z: -150, label: 'North Promenade Apex', radius: 11 },
      { x: -150, z: -150, label: 'West Seawall Hairpin', radius: 11 },
      { x: -150, z: 75, label: 'Vista Medical Straight', radius: 11 },
      { x: -36, z: 36, label: 'Finish at Solana Customs Garage', radius: 12 },
    ],
    introDialogue:
      'Marcus Cole: "The boulevards are open. Hit all four corners of the Bayfront loop and bring it home to Solana Customs before the clock zeroes."',
    completeDialogue:
      'Marcus Cole: "You shredded the district record. $3,200 wired—stop by Solana Customs anytime to tune or repaint your fleet."',
  },
  {
    id: 'heat-evasion',
    title: 'Code Three Breakout',
    giver: 'Elena Vance',
    category: 'Law Evasion',
    description:
      'Solana PD flagged your plate near Bayfront Precinct. Shake the interceptors and slip back to Oceanview Safehouse.',
    reward: 4000,
    triggerWanted: 2,
    checkpoints: [
      { x: -75, z: 0, label: 'Break Out Past Central Park', radius: 12 },
      { x: 0, z: 150, label: 'Cut Across Harbor South', radius: 12 },
      { x: 42, z: -36, label: 'Reach Oceanview Safehouse', radius: 10 },
    ],
    introDialogue:
      'Elena Vance: "Interceptors just lit up Bayfront Precinct! Use the side boulevards, stay off the main strip, and make it back to the Safehouse."',
    completeDialogue:
      'Elena Vance: "Dispatch lost your trail. Lay low inside the Safehouse—here is $4,000 for keeping your cool under sirens."',
  },
  {
    id: 'solana-tour',
    title: 'Postcards from Solana Bay',
    giver: 'Solana Tourism Board',
    category: 'Exploration',
    description:
      'Visit four iconic landmarks across the peninsula on foot or by car: Central Park Fountain, Club Solara, Coral Pier, and Cape Lighthouse.',
    reward: 1800,
    checkpoints: [
      { x: -37, z: -22, label: 'Inspect Central Park Fountain', radius: 12 },
      { x: 98, z: 48, label: 'Visit Club Solara Terrace', radius: 11 },
      { x: 175, z: 0, label: 'Walk Coral Pier Marina', radius: 12 },
      { x: 150, z: 150, label: 'Reach Solana Cape Lighthouse', radius: 16 },
    ],
    introDialogue:
      'City Guide: "Welcome to Solana Bay! Explore four signature landmarks across the district to earn an explorer stipend."',
    completeDialogue:
      'City Guide: "All four Solana Bay landmarks logged! $1,800 credited to your balance."',
  },
];
