// The five kinds of people who use REMMO, for the sign-in pages.
export type RoleKey = 'buyer' | 'developer' | 'contractor' | 'vendor' | 'employee';
export const ROLES: Record<RoleKey, { emoji: string; title: string; who: string; can: string[]; demo: string; method: 'phone' | 'email'; after: string; signup: string }> = {
  buyer: {
    emoji: '🏡', title: 'Home buyers', who: 'Buy a flat or a plot and follow it being built.',
    can: ['Walk through flats in 3D before they exist', 'Book with a refundable token and pay as the building rises', 'See your floor’s progress and every payment in one place'],
    demo: 'buyer@remmo.dev', method: 'phone', after: '/me', signup: 'New here? Create your account',
  },
  developer: {
    emoji: '🏢', title: 'Developers', who: 'Sell, build and run your projects.',
    can: ['List plotted layouts and apartment towers with live availability', 'Track sales, construction, materials and every partner', 'Issue work orders and letters, approve bills and payments'],
    demo: 'sales@demodevelopers.dev', method: 'email', after: '/start', signup: 'New developer? Create an account and register your company',
  },
  contractor: {
    emoji: '👷', title: 'Contractors', who: 'Do the work and get paid for it on time.',
    can: ['Log daily progress and request materials', 'Manage your crew, tasks, attendance and leave', 'Raise running bills and watch them move to payment'],
    demo: 'contractor@abcconstructions.dev', method: 'email', after: '/join?role=contractor', signup: 'New contractor? Create an account, then join with the developer’s invite code',
  },
  vendor: {
    emoji: '🚚', title: 'Suppliers', who: 'Supply materials to the site.',
    can: ['Accept purchase orders with a delivery date', 'Log deliveries with invoice photos', 'Keep your price list current and see every payment'],
    demo: 'vendor@xyzmaterials.dev', method: 'email', after: '/join?role=vendor', signup: 'New supplier? Create an account, then join with the developer’s invite code',
  },
  employee: {
    emoji: '🦺', title: 'Site team', who: 'Work on site every day.',
    can: ['Check in with a selfie at the site gate', 'See today’s tasks, ask for leave, track wages', 'Carry your site ID card on your phone'],
    demo: 'employee@remmo.dev', method: 'phone', after: '/join?role=employee', signup: 'New on site? Create an account, then join with your company’s invite code',
  },
};
export const isRoleKey = (r: string | undefined): r is RoleKey => !!r && r in ROLES;
