import { useParams, useNavigate, Link } from "react-router-dom";
import { useContext } from "react";
import { InventoryContext } from "../context/InventoryContext";

function FurnitureDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { furniture, deleteFurniture } = useContext(InventoryContext);

  const item = furniture.find((f) => f.id === Number(id));

  if (!item) {
    return (
      <div className="text-white text-xl">
        Asset not found
      </div>
    );
  }

  const handleDelete = () => {
    deleteFurniture(item.id);
    navigate("/furniture");
  };

  return (
    <div className="text-white animate-fadeIn">

      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">

        <div>
          <div className="text-xs text-white/50">
            Inventory Number
          </div>

          <div className="text-2xl md:text-3xl font-semibold break-all mt-1">
            {item.invNumber}
          </div>

          <div className="mt-3 text-lg text-white/80">
            {item.name}
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <span className="px-3 py-1 text-xs rounded-full bg-white/5 border border-white/10">
              {item.status}
            </span>
            <span className="px-3 py-1 text-xs rounded-full bg-white/5 border border-white/10">
              {item.condition}
            </span>
            <span className="px-3 py-1 text-xs rounded-full bg-white/5 border border-white/10">
              {item.type}
            </span>
          </div>
        </div>

        {/* BUTTONS */}
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">

          <button
            onClick={() => navigate(-1)}
            className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 transition w-full sm:w-auto"
          >
            Back
          </button>

          <Link
            to={`/furniture/${item.id}/edit`}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 transition text-center w-full sm:w-auto"
          >
            Edit
          </Link>

          <button
            onClick={handleDelete}
            className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 transition w-full sm:w-auto"
          >
            Delete
          </button>

        </div>
      </div>

      {/* LOCATION */}
      <div className="glass rounded-2xl p-6 mt-8">
        <div className="text-sm text-white/50 mb-2">
          Location
        </div>

        <div className="text-white text-base leading-relaxed">
          {item.region} / {item.organization}
        </div>

        <div className="text-white/70 mt-2">
          Building {item.building} — Room {item.room}
        </div>
      </div>

    </div>
  );
}

export default FurnitureDetail;