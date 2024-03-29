import {
  Coordinate,
  constructReverseCoordinates,
} from "../models/address.model";
import { InvalidParameterError, MissingKeyError } from "../models/error.model";

type LocationSearch = {
  locations?: Coordinate[];
  range?: number[];
  orsKey?: string;
};

export default async function getIntersectingArea(data: LocationSearch) {
  if (!data.orsKey)
    throw new MissingKeyError(
      "API key not provided. Go to settings to save a key"
    );
  if (!data?.locations || !data?.range) {
    throw new InvalidParameterError(
      "Required parameters to get intersecting area were not present"
    );
  }

  const locationTuple = data.locations.map((location: Coordinate) => [
    location.lng,
    location.lat,
  ]);
  const requestData: {
    locations: number[][];
    range: number[];
    smoothing: number;
  } = {
    locations: locationTuple,
    range: [60 * data.range[0]],
    smoothing: 10,
  };

  const requestOptions = {
    body: JSON.stringify(requestData),
    method: "POST",
    headers: {
      Authorization: data.orsKey,
      "content-type": "application/json",
    },
  };

  try {
    const response = await fetch(
      "https://api.openrouteservice.org/v2/isochrones/driving-car",
      requestOptions
    );

    let responseBody;

    if (response.headers.get("content-type")?.includes("json")) {
      responseBody = await response.json();
    } else {
      responseBody = await response.text();
    }

    if (!responseBody.features) {
      throw new Error("Invalid response for retrieving isochrone polygon");
    }

    if (!responseBody?.features[0]?.properties?.center)
      throw new Error(
        "Did not receive required center location or poly coordinates"
      );
    const formattedPolygon = {
      center: reverseLatAndLong(responseBody.features[0].properties.center),
      poly: constructReverseCoordinates(
        responseBody.features[0].geometry.coordinates[0]
      ),
    };

    return formattedPolygon;
  } catch (error) {
    throw error;
  }
}

function reverseLatAndLong(data: any): Coordinate {
  if (!data || data.length === 0) return { lat: 0, lng: 0 };
  return { lat: data[1], lng: data[0] };
}
