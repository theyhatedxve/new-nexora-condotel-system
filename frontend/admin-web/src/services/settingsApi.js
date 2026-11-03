import api from "./api";

import {
  getSession,
} from "./authApi";

export const PROPERTY_FIELDS = [
  {
    key: "name",
    label: "Property name",
    required: true,
    max: 100,
  },
  {
    key: "address",
    label: "Address",
    required: true,
    max: 500,
  },
  {
    key: "city",
    label: "City",
    required: true,
    max: 100,
  },
  {
    key: "province",
    label: "Province",
    required: true,
    max: 100,
  },
  {
    key: "country",
    label: "Country",
    required: true,
    max: 100,
  },
  {
    key: "phone",
    label: "Phone",
    required: false,
    max: 30,
    type: "tel",
  },
  {
    key: "email",
    label: "Email",
    required: false,
    max: 254,
    type: "email",
  },
  {
    key: "description",
    label: "Description",
    required: false,
    max: 2000,
  },
];

function assertAdmin(actorId) {
  const session = getSession();

  if (
    session.status !== "authenticated" ||
    session.user?.role !== "ADMIN" ||
    (
      actorId !== undefined &&
      session.user.id !== actorId
    )
  ) {
    throw new Error(
      "Administrator access is required.",
    );
  }
}

function canonicalTimestamp(value) {
  if (typeof value !== "string") {
    return false;
  }

  const date = new Date(value);

  return (
    Number.isFinite(date.getTime()) &&
    date.toISOString() === value
  );
}

function projectSettings(data) {
  const property = data?.property;
  const reference = data?.reference;

  if (
    !property ||
    typeof property.id !== "string" ||
    !property.id ||
    !canonicalTimestamp(property.updatedAt) ||
    !reference ||
    !Number.isSafeInteger(
      reference.reservationHoldMinutes,
    ) ||
    reference.reservationHoldMinutes <= 0 ||
    !Number.isSafeInteger(
      reference.bookingLinkMinutes,
    ) ||
    reference.bookingLinkMinutes <= 0
  ) {
    throw new Error(
      "Property settings are unavailable.",
    );
  }

  const projected = {
    id: property.id,
    updatedAt: property.updatedAt,
  };

  for (const field of PROPERTY_FIELDS) {
    const value = property[field.key];

    if (
      typeof value !== "string" &&
      !(value === null && !field.required)
    ) {
      throw new Error(
        "Property settings are unavailable.",
      );
    }

    projected[field.key] = value;
  }

  return {
    property: projected,
    reference: {
      reservationHoldMinutes:
        reference.reservationHoldMinutes,
      bookingLinkMinutes:
        reference.bookingLinkMinutes,
    },
  };
}

export function propertyDraft(property) {
  return Object.fromEntries(
    PROPERTY_FIELDS.map((field) => [
      field.key,
      property[field.key] ?? "",
    ]),
  );
}

export function normalizePropertyInput(values) {
  const result = {};

  for (const field of PROPERTY_FIELDS) {
    const raw = values[field.key];

    if (
      typeof raw !== "string" &&
      !(raw === null && !field.required)
    ) {
      throw new Error(
        `Check ${field.label.toLowerCase()}.`,
      );
    }

    const value = (raw ?? "").trim();

    if (field.required && !value) {
      throw new Error(
        `${field.label} is required.`,
      );
    }

    if (value.length > field.max) {
      throw new Error(
        `${field.label} must be ${field.max} characters or fewer.`,
      );
    }

    result[field.key] =
      !field.required && !value
        ? null
        : value;
  }

  return result;
}

export async function getPropertySettings(signal) {
  const session = getSession();
  const actorId = session.user?.id;

  assertAdmin(actorId);

  const response = await api.get(
    "/settings/property",
    { signal },
  );

  assertAdmin(actorId);

  return projectSettings(
    response.data?.data,
  );
}

export async function savePropertySettings(
  baseline,
  values,
  actorId,
) {
  assertAdmin(actorId);

  if (
    !baseline?.id ||
    !canonicalTimestamp(baseline.updatedAt)
  ) {
    throw new Error(
      "Reload the current settings before saving.",
    );
  }

  const normalized =
    normalizePropertyInput(values);

  const response = await api.patch(
    "/settings/property",
    {
      ...normalized,
      updatedAt: baseline.updatedAt,
    },
  );

  assertAdmin(actorId);

  const raw = response.data?.data;
  const result = projectSettings(raw);

  if (
    typeof raw.changed !== "boolean" ||
    result.property.id !== baseline.id ||
    !PROPERTY_FIELDS.every(
      (field) =>
        result.property[field.key] ===
        normalized[field.key],
    ) ||
    (
      raw.changed &&
      Date.parse(result.property.updatedAt) <=
        Date.parse(baseline.updatedAt)
    ) ||
    (
      !raw.changed &&
      result.property.updatedAt !==
        baseline.updatedAt
    )
  ) {
    throw new Error(
      "The settings save could not be confirmed.",
    );
  }

  return {
    ...result,
    changed: raw.changed,
  };
}