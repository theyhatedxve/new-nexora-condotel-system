import { CalendarDays, Search, Users } from "lucide-react";
import { getPhilippineToday, MAX_GUESTS } from "../utils/staySearch.js";
import useHomeStaySearch from "../hooks/useHomeStaySearch.js";
import "../styles/home-stay-search.css";

function HomeStaySearch() {
  const { formRef, values, errors, changeField, submit } = useHomeStaySearch();

  return (
    <section className="home-stay-search" aria-labelledby="home-stay-search-title">
      <h2 id="home-stay-search-title" className="home-stay-search__title">
        Find your next stay
      </h2>

      <form ref={formRef} className="home-stay-search__form" onSubmit={submit} noValidate>
        <div className="home-stay-search__field">
          <label htmlFor="home-check-in">
            <CalendarDays size={18} aria-hidden="true" />
            Check-in
          </label>

          <input
            id="home-check-in"
            name="checkIn"
            type="date"
            required
            min={getPhilippineToday()}
            value={values.checkIn}
            aria-invalid={Boolean(errors.checkIn)}
            aria-describedby={errors.checkIn ? "home-check-in-error" : undefined}
            onChange={(event) => changeField("checkIn", event.target.value)}
          />

          {errors.checkIn && (
            <p id="home-check-in-error" className="home-stay-search__error">
              {errors.checkIn}
            </p>
          )}
        </div>

        <div className="home-stay-search__field">
          <label htmlFor="home-check-out">
            <CalendarDays size={18} aria-hidden="true" />
            Check-out
          </label>

          <input
            id="home-check-out"
            name="checkOut"
            type="date"
            required
            min={values.checkIn || getPhilippineToday()}
            value={values.checkOut}
            aria-invalid={Boolean(errors.checkOut)}
            aria-describedby={errors.checkOut ? "home-check-out-error" : undefined}
            onChange={(event) => changeField("checkOut", event.target.value)}
          />

          {errors.checkOut && (
            <p id="home-check-out-error" className="home-stay-search__error">
              {errors.checkOut}
            </p>
          )}
        </div>

        <div className="home-stay-search__field">
          <label htmlFor="home-guests">
            <Users size={18} aria-hidden="true" />
            Guests
          </label>

          <input
            id="home-guests"
            name="guests"
            type="number"
            required
            min={1}
            max={MAX_GUESTS}
            step={1}
            value={values.guests}
            aria-invalid={Boolean(errors.guests)}
            aria-describedby={errors.guests ? "home-guests-error" : undefined}
            onChange={(event) => changeField("guests", event.target.value)}
          />

          {errors.guests && (
            <p id="home-guests-error" className="home-stay-search__error">
              {errors.guests}
            </p>
          )}
        </div>

        <button type="submit" className="home-stay-search__button">
          <Search size={19} aria-hidden="true" />
          Search
        </button>

        {Object.keys(errors).length > 0 && (
          <p className="home-stay-search__notice" role="alert">
            Check the highlighted search fields.
          </p>
        )}
      </form>

      <p className="home-stay-search__help">
        Check availability for up to 30 nights. Searching does not reserve a room.
      </p>
    </section>
  );
}
export default HomeStaySearch;
