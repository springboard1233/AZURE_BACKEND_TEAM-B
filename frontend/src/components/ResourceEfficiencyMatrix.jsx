import React from "react";

const ResourceEfficiencyMatrix = ({ data }) => {
  // data is expected to be an array of objects with region, resourceType, and userEngagement metrics

  // Extract unique regions and resource types
  const regions = [...new Set(data.map(d => d.region))];
  const resourceTypes = [...new Set(data.map(d => d.resourceType))];

  // Create a matrix mapping region and resourceType to userEngagement
  const matrix = {};
  data.forEach(d => {
    if (!matrix[d.region]) matrix[d.region] = {};
    matrix[d.region][d.resourceType] = d.userEngagement;
  });

  return (
    <div className="resource-efficiency-matrix">
      <h3 className="text-xl font-semibold mb-4">Resource Efficiency Matrix</h3>
      <table className="min-w-full border border-gray-300 rounded-lg overflow-hidden">
        <thead className="bg-gray-100">
          <tr>
            <th className="border border-gray-300 px-4 py-2 text-left">Region / Resource</th>
            {resourceTypes.map(rt => (
              <th key={rt} className="border border-gray-300 px-4 py-2 text-center">{rt}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {regions.map(region => (
            <tr key={region} className="hover:bg-gray-50">
              <td className="border border-gray-300 px-4 py-2 font-medium">{region}</td>
              {resourceTypes.map(rt => (
                <td key={rt} className="border border-gray-300 px-4 py-2 text-center">
                  {matrix[region] && matrix[region][rt] !== undefined ? matrix[region][rt] : "-"}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ResourceEfficiencyMatrix;
