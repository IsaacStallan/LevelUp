export const TITLES = [
  { id: 'first_step',     name: 'First Step',      desc: 'Complete your first habit'    },
  { id: 'habit_seed',     name: 'Habit Seed',       desc: 'Reach a 7-day streak'         },
  { id: 'fortnight',      name: 'Fortnight Force',  desc: 'Reach a 14-day streak'        },
  { id: 'monthly_master', name: 'Monthly Master',   desc: 'Reach a 30-day streak'        },
  { id: 'habit_machine',  name: 'Habit Machine',    desc: 'Complete 50 habits total'     },
  { id: 'century_club',   name: 'Century Club',     desc: 'Complete 100 habits total'    },
  { id: 'xp_apprentice',  name: 'XP Apprentice',    desc: 'Earn 100 XP'                  },
  { id: 'xp_knight',      name: 'XP Knight',        desc: 'Earn 500 XP'                  },
  { id: 'xp_legend',      name: 'XP Legend',        desc: 'Earn 1000 XP'                 },
  { id: 'rising_star',    name: 'Rising Star',      desc: 'Reach level 5'                },
  { id: 'the_grind',      name: 'The Grind',        desc: 'Reach level 25'               },
  { id: 'legendary',      name: 'Legendary',        desc: 'Reach level 50'               },
];

export function checkUnlocks(stats, existingUnlocked) {
  const { total_completions, current_streak, xp_total, level } = stats;
  const conditions = {
    first_step:     total_completions >= 1,
    habit_seed:     current_streak >= 7,
    fortnight:      current_streak >= 14,
    monthly_master: current_streak >= 30,
    habit_machine:  total_completions >= 50,
    century_club:   total_completions >= 100,
    xp_apprentice:  xp_total >= 100,
    xp_knight:      xp_total >= 500,
    xp_legend:      xp_total >= 1000,
    rising_star:    level >= 5,
    the_grind:      level >= 25,
    legendary:      level >= 50,
  };
  return TITLES
    .filter(t => !existingUnlocked.includes(t.id) && conditions[t.id])
    .map(t => t.id);
}
