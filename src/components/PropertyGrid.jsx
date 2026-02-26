import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Star, MapPin, Users, Bed, Bath } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function PropertyGrid({ properties, isLoading, pagination, onPageChange }) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <div className="h-48 bg-gray-200 rounded-t-lg"></div>
            <CardContent className="pt-4 space-y-2">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!properties || properties.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600 text-lg">No properties found. Try adjusting your filters.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {properties.map(property => (
          <Link key={property.id} to={createPageUrl('PropertyDetails') + `?id=${property.id}`}>
            <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer">
              {property.photos && property.photos[0] && (
                <div className="h-48 bg-gray-200 rounded-t-lg overflow-hidden">
                  <img
                    src={property.photos[0]}
                    alt={property.title}
                    className="w-full h-full object-cover hover:scale-105 transition-transform"
                  />
                </div>
              )}
              <CardContent className="pt-4 space-y-3">
                <div>
                  <CardTitle className="text-lg line-clamp-2">{property.title}</CardTitle>
                  <div className="flex items-center gap-1 text-sm text-gray-600 mt-1">
                    <MapPin className="w-4 h-4" />
                    <span>{property.location?.county || 'Location'}</span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div className="flex items-center gap-1">
                    <Users className="w-4 h-4 text-gray-400" />
                    <span>{property.max_guests}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Bed className="w-4 h-4 text-gray-400" />
                    <span>{property.bedrooms}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Bath className="w-4 h-4 text-gray-400" />
                    <span>{property.bathrooms}</span>
                  </div>
                </div>

                <div className="border-t pt-3 flex items-end justify-between">
                  <div>
                    <p className="text-2xl font-bold text-gray-900">
                      £{property.price_per_night}
                    </p>
                    <p className="text-xs text-gray-600">per night</p>
                  </div>
                  {property.average_rating > 0 && (
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                      <span className="text-sm font-medium">{property.average_rating}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Pagination */}
      {pagination && pagination.pages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-8">
          <Button
            variant="outline"
            disabled={pagination.page === 1}
            onClick={() => onPageChange(pagination.page - 1)}
          >
            Previous
          </Button>
          
          {[...Array(pagination.pages)].map((_, i) => (
            <Button
              key={i + 1}
              variant={pagination.page === i + 1 ? 'default' : 'outline'}
              onClick={() => onPageChange(i + 1)}
            >
              {i + 1}
            </Button>
          ))}

          <Button
            variant="outline"
            disabled={pagination.page === pagination.pages}
            onClick={() => onPageChange(pagination.page + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}