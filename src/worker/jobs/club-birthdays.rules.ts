/**
 * Legacy `ClubBirthdays`: a club founded on today's day and month celebrates
 * `this year − founding year` years. Feb 29 founders only get one in leap years, as in legacy.
 */
export function birthdayAge(foundingDate: string, today: string): number | null {
	const [year, month, day] = foundingDate.split('-');
	const [todayYear, todayMonth, todayDay] = today.split('-');
	if (month !== todayMonth || day !== todayDay) return null;
	return Number(todayYear) - Number(year);
}

export const birthdayPostText = (club: string, age: number) =>
	`Parabéns ${club}! 🎂🎉 Hoje celebram ${age} anos de história!`;
