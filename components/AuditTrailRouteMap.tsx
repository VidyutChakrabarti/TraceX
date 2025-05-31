import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Spinner } from "@chakra-ui/react";

const MapWithRoute = dynamic(() => import("./MapWithRoute"), { ssr: false });

export default function AuditTrailRouteMap({ transactionId }) {
  const [routeData, setRouteData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!transactionId) return;
    setLoading(true);
    fetch(`/api/custodyRoute/${transactionId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setRouteData(data.data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [transactionId]);

  if (loading) return <Spinner size="sm" />;
  if (!routeData) return <div>No route data found.</div>;

  const from = [routeData.from.lat, routeData.from.lng];
  const to = [routeData.to.lat, routeData.to.lng];
  const routeCoords = routeData.route.map((pt) => [pt.lat, pt.lng]);

  return (
    <div style={{ height: 200, width: "100%" }}>
      <MapWithRoute
        userLocation={from}
        setUserLocation={() => {}}
        destination={to}
        setDestination={() => {}}
        routeCoords={routeCoords}
        setRouteCoords={() => {}}
        allowSelectDestination={false}
      />
    </div>
  );
}
