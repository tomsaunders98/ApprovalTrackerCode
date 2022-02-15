import * as d3 from "d3";

const format = function (d) {
  return {
    date: d3.timeParse("%Y-%m-%d")(d.date),
    type: d.type,
    person: d.person,
    est: +d.est,
    upper: +d.upper,
    lower: +d.lower,
    points: d.points === "NA" ? null : +d.points,
  };
};

let margin = {
  top: 10,
  right: 100,
  bottom: 30,
  left: 30,
};
let person = "Boris";
let fullwidth = 750;
let fullheight = 300;
let width = fullwidth - margin.left - margin.right;
let height = fullheight - margin.top - margin.bottom;
let viewbox = [0, 0, fullwidth, fullheight];
const svg = d3
  .select(".main")
  .append("svg")
  .attr("viewBox", viewbox)
  .classed("svg-container", true)
  .attr("preserveAspectRatio", "xMinYMin")
  .append("g")
  .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

d3.csv("https://aclearvote.co/approval/preds.csv", format).then(function (
  data
) {
  const r = d3.extent(
    data.map(function (item) {
      return item.date;
    })
  );
  let extent = 1;
  r[0] = r[0].setDate(r[0].getDate() - extent);
  let today = new Date();
  r[1] = today;
  //solves strange bug where first date on csv automatically binds to earliest date on scale
  data[0].date = data[0].date.setDate(data[0].date.getDate() + extent);

  const x = d3.scaleTime().domain(r).range([0, width]);

  const y = d3.scaleLinear().domain([0, 0.8]).range([height, 0]);

  const color = d3
    .scaleOrdinal()
    .domain(["approve", "disprove"])
    .range(["#E35D3B", "#5c909d"]);

  const datef = d3.timeFormat("%e-%b-%Y");
  const bisect = d3.bisector((d) => d.date).left;

  svg
    .append("g")
    .attr("transform", "translate(0," + height + ")")
    .call(d3.axisBottom(x).tickFormat(d3.timeFormat("%b %Y")));

  svg.append("g").call(d3.axisLeft(y).tickFormat(d3.format(".0%")));

  let showdata;
  let types;

  function BuildGraph(person) {
    const grouped = d3.group(
      data,
      (d) => d.person,
      (d) => d.type
    );
    showdata = grouped.get(person);
    types = Array.from(showdata.keys());

    const fullName = new Map();
    fullName.set("approve", {
      name: "Approve",
    });
    fullName.set("disprove", {
      name: "Disapprove",
    });

    var focusgroup = svg.append("g").attr("id", "fg");
    focusgroup
      .append("line")
      .attr("id", "focusLine")
      .attr("stroke-dasharray", "5, 5");

    types.forEach((item, i) => {
      //Get the last y + x value for each group
      var y3 = showdata.get(item);
      var x0 = y3[y3.length - 1].date;
      var yval = y3[y3.length - 1].est;
      var yval_f = Math.round(yval * 100) + "%";
      var name = fullName.get(item).name;
      d3.select(".datefig").html(datef(x0));
      if (item == "approve") {
        var dvar = 20;
      } else {
        var dvar = -30;
      }

      //Add in circles for each group
      focusgroup
        .append("circle")
        .style("fill", "none")
        .style("fill", color(item))
        .attr("r", 3)
        .attr("class", "track_" + item)
        .style("opacity", 1)
        .attr("cx", x(x0))
        .attr("cy", y(yval));

      var ts = focusgroup
        .append("text")
        .attr("class", "text_" + item)
        .attr("x", x(x0))
        .attr("y", y(yval));

      ts.append("tspan").text(name).attr("dy", dvar);
      ts.append("tspan")
        .text(yval_f)
        .attr("dy", 20)
        .attr("class", "tspan_" + item)
        .attr("x", x(x0));
    });

    focusgroup
      .append("g")
      .append("rect")
      .style("fill", "none")
      .style("pointer-events", "all")
      .attr("width", width)
      .attr("height", height)
      .on("mouseover", mouseover)
      .on("mousemove", mousemove)
      .on("mouseout", mouseout);
  }

  function UpdateGraph() {
    const dg = svg.append("g").attr("id", "dg");
    //Polls
    dg.append("g")
      .selectAll("dot")
      .data(data)
      .enter()
      .append("circle")
      .filter(function (d) {
        return d.points;
      })
      .filter(function (d) {
        return d.person === person;
      })
      .attr("class", function (d) {
        return "dots " + d.type;
      })
      .attr("r", 1.5)
      .style("fill", function (d) {
        return color(d.type);
      })
      .transition()

      .attr("cx", function (d) {
        return x(d.date);
      })
      .attr("cy", function (d) {
        return y(d.points);
      });

    //Confidence Intervals
    dg.append("g")
      .selectAll("area")
      .data(showdata)
      .join("path")
      .attr("stroke", "none")
      .attr("class", function (d) {
        return "conf area_" + d[0];
      })
      .attr("opacity", 0.3)
      .attr("stroke-width", 1.5)
      .transition()
      .attr("fill", function (d) {
        return color(d[0]);
      })
      .attr("d", function (d) {
        return d3
          .area()
          .x(function (d) {
            return x(d.date);
          })
          .y0(function (d) {
            return y(+d.upper);
          })
          .y1(function (d) {
            return y(+d.lower);
          })(d[1]);
      });

    //Central Estimate
    dg.append("g")
      .selectAll(".line")
      .data(showdata)
      .join("path")
      .attr("fill", "none")
      .attr("class", function (d) {
        return "line line_" + d[0];
      })
      .attr("stroke-width", 1)
      .transition()
      .attr("stroke", function (d) {
        return color(d[0]);
      })

      .attr("d", function (d) {
        return d3
          .line()
          .x(function (d) {
            return x(d.date);
          })
          .y(function (d) {
            return y(+d.est);
          })(d[1]);
      });

    // dg.append("g")
    //   .append("rect")
    //   .style("fill", "none")
    //   .style("pointer-events", "all")
    //   .attr("width", width)
    //   .attr("height", height)
    //   .on("mouseover", mouseover)
    //   .on("mousemove", mousemove)
    //   .on("mouseout", mouseout);

    d3.select("#fg").raise();
  }

  //Mousehovering components

  function mouseover() {
    d3.select("#focusLine").style("opacity", 1);
  }
  function mousemove(e) {
    e.preventDefault();

    //recover date from x pos
    var x0 = x.invert(d3.pointer(e)[0]);

    //update date headline fig
    d3.select(".datefig").html(datef(x0));

    //Update line position
    d3.select("#focusLine")
      .attr("x1", x(x0))
      .attr("y1", y(0))
      .attr("x2", x(x0))
      .attr("y2", y(0.8));

    //Calculate final position for approval and disproval
    var y3_a = showdata.get("approve");
    var yval_af = y3_a[y3_a.length - 1].est;

    var y3_d = showdata.get("disprove");
    var yval_df = y3_d[y3_d.length - 1].est;

    //If dispproval larger at end then disproval always on top (othewise otherway round)
    var i_a = bisect(y3_a, x0);
    var yval_a = y3_a[i_a].est;
    var yval_ap = Math.round(yval_a * 100) + "%";

    var i_d = bisect(y3_d, x0);
    var yval_d = y3_d[i_d].est;
    var yval_dp = Math.round(yval_d * 100) + "%";

    if (yval_df > yval_af) {
      var yval_dn = Math.max.apply(Math, [yval_a, yval_d]);
      var yval_an = Math.min.apply(Math, [yval_a, yval_d]);
    } else {
      var yval_dn = Math.min.apply(Math, [yval_a, yval_d]);
      var yval_an = Math.max.apply(Math, [yval_a, yval_d]);
    }
    d3.select(".text_approve").attr("x", x(x0)).attr("y", y(yval_an));

    d3.select(".tspan_approve").attr("x", x(x0)).text(yval_ap);

    d3.select(".text_disprove").attr("x", x(x0)).attr("y", y(yval_dn));

    d3.select(".tspan_disprove").attr("x", x(x0)).text(yval_dp);

    //For each party, bisect x with group y val
    types.forEach((item) => {
      let element = ".track_" + item;

      let y3 = showdata.get(item);
      let i = bisect(y3, x0);

      //If mouse is past graph, set bisect (index) value to max
      if (i > y3.length - 1) {
        i = y3.length - 1;
      }

      //get y value for group
      let yval = y3[i].est;

      let yval_f = Math.round(yval * 100) + "%";



      //update circle positions
      d3.select(element).attr("cx", x(x0)).attr("cy", y(yval));

      //update headline
    });

    //disapproval bounding box
  }

  function mouseout() {
    //clear line
    d3.select("#focusLine").style("opacity", 0);

    //reset circle positiosn (same code as rendering circles)
    types.forEach((item) => {
      var element = ".track_" + item;
      var text = ".text_" + item;
      var span = ".tspan_" + item;

      var y3 = showdata.get(item);
      var x0 = y3[y3.length - 1].date;
      var yval = y3[y3.length - 1].est;
      var yval_f = Math.round(yval * 100) + "%";

      d3.select(element).attr("cx", x(x0)).attr("cy", y(yval));
      d3.select(text).attr("x", x(x0)).attr("y", y(yval));
      d3.select(span).attr("x", x(x0)).text(yval_f);

      d3.select(".datefig").html(datef(x0));
    });
  }

  let alternates = document.getElementsByClassName("alts");

  for (var i = 0; i < alternates.length; i++) {
    alternates[i].addEventListener("click", function (e) {
      d3.selectAll(".alts").classed("active", false);
      d3.select("#" + e.target.id).classed("active", true);
      d3.select("#dg").remove();
      d3.select("#fg").remove();
      BuildGraph((person = e.target.id));
      UpdateGraph();
    });
  }

  BuildGraph((person = "Boris"));
  UpdateGraph();
});
