import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Spinner, Box, Button } from "@chakra-ui/react";

const MapWithRoute = dynamic(() => import("./MapWithRoute"), { ssr: false });

export default function AuditTrailRouteMap({ transactionId }) {
  const [routeData, setRouteData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);

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
    <Box>
      <Box
        style={{
          height: isExpanded ? '400px' : '250px',
          width: '100%',
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
          overflow: 'hidden',
          position: 'relative'
        }}
      >
        <MapWithRoute
          userLocation={from}
          setUserLocation={() => { }}
          destination={to}
          setDestination={() => { }}
          routeCoords={routeCoords}
          setRouteCoords={() => { }}
          allowSelectDestination={false}
          customHeight="100%"
        />
      </Box>
      <Button
        size="sm"
        mt={2}
        colorScheme="blue"
        variant="outline"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {isExpanded ? 'Collapse Map' : 'Expand Map'}
      </Button>
    </Box>
  );
}
