// Pure availability rules. No database access, so they are easy to test.
//
// Every date is a Philippine calendar date stored as a UTC-midnight marker.
// A stay includes its check-in night and excludes its check-out date.

const ONE_DAY_MS = 86_400_000;

export interface DateRange {
  startDate: Date;
  endDate: Date;
}

export interface AvailabilityRoom {
  // Active dated blocks that overlap the searched stay.
  blocks: DateRange[];
}

export interface AvailabilityReservation {
  checkInDate: Date;
  checkOutDate: Date;
}

export function countNights(startDate: Date, endDate: Date): number {
  return Math.round((endDate.getTime() - startDate.getTime()) / ONE_DAY_MS);
}

function coversNight(range: DateRange, night: number): boolean {
  return range.startDate.getTime() <= night && range.endDate.getTime() > night;
}

/**
 * True when at least one room is still free on every night of the stay.
 * Free rooms = rooms without a block that night - reservations holding that night.
 *
 * This is an information check only. It reserves nothing, and booking must
 * check again inside its own transaction.
 */
export function hasRoomEveryNight(input: {
  rooms: AvailabilityRoom[];
  reservations: AvailabilityReservation[];
  startDate: Date;
  endDate: Date;
}): boolean {
  const { rooms, reservations, startDate, endDate } = input;
  const nights = countNights(startDate, endDate);

  for (let index = 0; index < nights; index += 1) {
    const night = startDate.getTime() + index * ONE_DAY_MS;

    const usableRooms = rooms.filter(
      (room) => !room.blocks.some((block) => coversNight(block, night)),
    ).length;

    const heldRooms = reservations.filter((reservation) =>
      coversNight(
        { startDate: reservation.checkInDate, endDate: reservation.checkOutDate },
        night,
      ),
    ).length;

    if (usableRooms - heldRooms < 1) {
      return false;
    }
  }

  return true;
}