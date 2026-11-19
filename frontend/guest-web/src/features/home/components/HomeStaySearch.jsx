import { Search } from "lucide-react";
import RentalStayFields from "../../../shared/components/RentalStayFields.jsx";
import useHomeStaySearch from "../hooks/useHomeStaySearch.js";
import "../styles/home-stay-search.css";

export default function HomeStaySearch() {
  const { formRef, values, errors, changeField, submit } =
    useHomeStaySearch();

  return (
    <section
      className="home-stay-search"
      aria-labelledby="home-stay-search-title"
    >
      <header className="home-stay-search__heading">
        <h2
          id="home-stay-search-title"
          className="home-stay-search__title"
        >
          Plan your stay
        </h2>

        <p>
          Find the right room, choose your dates, and check availability.
        </p>
      </header>

      <form
        ref={formRef}
        className="home-stay-search__form"
        onSubmit={submit}
        noValidate
      >
        <RentalStayFields
          values={values}
          errors={errors}
          onChange={changeField}
          prefix="home"
        />

        <button
          type="submit"
          className="home-stay-search__button"
        >
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
        Choose up to 30 days. Hourly stays run from 3 PM to 11 PM.
      </p>
    </section>
  );
}