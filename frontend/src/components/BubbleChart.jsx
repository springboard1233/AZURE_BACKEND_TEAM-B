import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

const BubbleChart = ({ data, width = 800, height = 600 }) => {
  const svgRef = useRef();

  useEffect(() => {
    if (!data || data.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const margin = { top: 20, right: 30, bottom: 40, left: 50 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const g = svg.append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Scales
    const xScale = d3.scaleLinear()
      .domain([0, d3.max(data, d => d.userEngagement)])
      .range([0, innerWidth]);

    const yScale = d3.scaleLinear()
      .domain([0, d3.max(data, d => d.cpuUsage)])
      .range([innerHeight, 0]);

    const radiusScale = d3.scaleSqrt()
      .domain([0, d3.max(data, d => d.storage)])
      .range([5, 30]);

    // Color scale for regions
    const colorScale = d3.scaleOrdinal(d3.schemeCategory10);

    // Axes
    g.append("g")
      .attr("transform", `translate(0,${innerHeight})`)
      .call(d3.axisBottom(xScale));

    g.append("g")
      .call(d3.axisLeft(yScale));

    // Axis labels
    g.append("text")
      .attr("transform", `translate(${innerWidth/2}, ${innerHeight + margin.bottom - 5})`)
      .style("text-anchor", "middle")
      .text("User Engagement");

    g.append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", 0 - margin.left)
      .attr("x", 0 - (innerHeight / 2))
      .attr("dy", "1em")
      .style("text-anchor", "middle")
      .text("CPU Usage (%)");

    // Bubbles
    g.selectAll("circle")
      .data(data)
      .enter()
      .append("circle")
      .attr("cx", d => xScale(d.userEngagement))
      .attr("cy", d => yScale(d.cpuUsage))
      .attr("r", d => radiusScale(d.storage))
      .attr("fill", d => colorScale(d.region))
      .attr("stroke", "#fff")
      .attr("stroke-width", 2)
      .style("opacity", 0.7)
      .on("mouseover", function(event, d) {
        d3.select(this)
          .transition()
          .duration(200)
          .style("opacity", 1)
          .attr("stroke-width", 3);

        // Tooltip
        const tooltip = d3.select("body").append("div")
          .attr("class", "tooltip")
          .style("position", "absolute")
          .style("background", "rgba(0,0,0,0.8)")
          .style("color", "white")
          .style("padding", "5px 10px")
          .style("border-radius", "5px")
          .style("pointer-events", "none")
          .style("opacity", 0);

        tooltip.transition()
          .duration(200)
          .style("opacity", 1);

        tooltip.html(`
          <strong>Region:</strong> ${d.region}<br/>
          <strong>User Engagement:</strong> ${d.userEngagement}<br/>
          <strong>CPU Usage:</strong> ${d.cpuUsage}%<br/>
          <strong>Storage:</strong> ${d.storage} GB
        `)
          .style("left", (event.pageX + 10) + "px")
          .style("top", (event.pageY - 10) + "px");
      })
      .on("mouseout", function() {
        d3.select(this)
          .transition()
          .duration(200)
          .style("opacity", 0.7)
          .attr("stroke-width", 2);

        d3.selectAll(".tooltip").remove();
      });

    // Legend
    const legend = g.append("g")
      .attr("transform", `translate(${innerWidth - 100}, 20)`);

    const uniqueRegions = [...new Set(data.map(d => d.region))];

    uniqueRegions.forEach((region, i) => {
      const legendRow = legend.append("g")
        .attr("transform", `translate(0, ${i * 20})`);

      legendRow.append("circle")
        .attr("r", 6)
        .attr("fill", colorScale(region));

      legendRow.append("text")
        .attr("x", 15)
        .attr("y", 5)
        .style("font-size", "12px")
        .text(region);
    });

  }, [data, width, height]);

  return (
    <div className="bubble-chart-container">
      <svg ref={svgRef} width={width} height={height}></svg>
      <style jsx>{`
        .tooltip {
          font-family: Arial, sans-serif;
          font-size: 12px;
        }
      `}</style>
    </div>
  );
};

export default BubbleChart;
