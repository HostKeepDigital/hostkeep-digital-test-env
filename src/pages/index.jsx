import React from "react";
import { Navigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function Index() {
  return <Navigate to={createPageUrl("Home")} replace />;
}