import {
  ConflictException,
  ServiceUnavailableException,
} from '@nestjs/common';

export interface Stay {
  id: string;
  start: Date;
  end: Date;
  roomIds: string[];
  readyOnly?: boolean;
}

export interface AllocationRoom {
  id: string;
  status: string;
  blocks: {
    startDate: Date;
    endDate: Date;
  }[];
}

export function overlaps(
  a: { start: Date; end: Date },
  b: { start: Date; end: Date },
) {
  return a.start < b.end && b.start < a.end;
}

// Include indirect overlaps because neighboring bookings
// can constrain which room another reservation may use.
export function connectedStays(
  request: Stay,
  existing: Stay[],
): Stay[] {
  const selected = [request];
  const remaining = new Set(existing);

  for (let index = 0; index < selected.length; index += 1) {
    for (const stay of remaining) {
      if (overlaps(selected[index], stay)) {
        selected.push(stay);
        remaining.delete(stay);
      }
    }
  }

  return selected;
}

// Prove that all connected stays can fit without room moves.
// No physical room assignments are persisted here.
export function assertAllocatable(
  rooms: AllocationRoom[],
  stays: Stay[],
): void {
  if (stays.length > 120) {
    throw new ServiceUnavailableException(
      'Inventory needs staff review.',
    );
  }

  const choices = stays
    .map((stay) => {
      if (stay.roomIds.length > 1) {
        throw new ConflictException(
          'A reservation has multiple active assignments.',
        );
      }

      const candidates = rooms.filter(
        (room) =>
          (!stay.readyOnly || room.status === 'READY') &&
          (
            stay.roomIds.length === 0 ||
            stay.roomIds[0] === room.id
          ) &&
          !room.blocks.some((block) =>
            overlaps(stay, {
              start: block.startDate,
              end: block.endDate,
            }),
          ),
      );

      return { stay, candidates };
    })
    .sort(
      (a, b) =>
        a.candidates.length - b.candidates.length,
    );

  const assigned = new Map<string, Stay[]>();
  let visited = 0;

  function search(index: number): boolean {
    if (index === choices.length) {
      return true;
    }

    if (++visited > 200_000) {
      throw new ServiceUnavailableException(
        'Inventory needs staff review.',
      );
    }

    const { stay, candidates } = choices[index];

    for (const room of candidates) {
      const occupants = assigned.get(room.id) ?? [];

      if (
        occupants.some((other) =>
          overlaps(stay, other),
        )
      ) {
        continue;
      }

      assigned.set(room.id, [...occupants, stay]);

      if (search(index + 1)) {
        return true;
      }

      assigned.set(room.id, occupants);
    }

    return false;
  }

  if (!search(0)) {
    throw new ConflictException(
      'No room inventory is available for the entire stay.',
    );
  }
}