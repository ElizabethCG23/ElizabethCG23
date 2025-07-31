document.addEventListener('DOMContentLoaded', function() {
    const csvFilePath = 'HGGA 10 mortalidad.csv'; 

    const loadingMessage = d3.select("#loading-message");
    loadingMessage.style("display", "block"); 

    const margin = { top: 20, right: 30, bottom: 40, left: 90 };
    const chartContainer = d3.select("#chart-container");
    let containerWidth, containerHeight, width, height;

    // Función para dibujar o actualizar el gráfico
    function drawChart(data) {
        loadingMessage.style("display", "none");
        
        // Limpia cualquier SVG previo para evitar duplicados al redimensionar
        chartContainer.select("svg").remove();

        containerWidth = chartContainer.node().getBoundingClientRect().width;
        containerHeight = 600; // Ajustamos la altura para acomodar más barras si es necesario

        width = containerWidth - margin.left - margin.right;
        height = containerHeight - margin.top - margin.bottom;

        // Log para verificar las dimensiones del gráfico
        console.log("Dimensiones del gráfico:", { containerWidth, containerHeight, width, height });

        const svg = chartContainer.append("svg")
            .attr("width", containerWidth)
            .attr("height", containerHeight)
            .attr("viewBox", `0 0 ${containerWidth} ${containerHeight}`) 
            .attr("preserveAspectRatio", "xMidYMid meet") 
            .append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        // Creación de Escalas
        const maxPacientes = d3.max(data, d => +d.numero_pacientes);
        console.log("Máximo de Numero_pacientes:", maxPacientes);
        console.log("Dominio xScale:", [0, maxPacientes * 1.1]);
        console.log("Rango xScale:", [0, width]);

        // Escala X para el número de pacientes (cuantitativa)
        const xScale = d3.scaleLinear()
            .domain([0, maxPacientes * 1.1]) 
            .range([0, width]);

        const categories = data.map(d => d.mortalidad);
        console.log("Categorías (dominio yScale):", categories);
        console.log("Rango yScale:", [0, height]);

        // Escala Y para las causas de mortalidad (banda, categórica)
        const yScale = d3.scaleBand()
            .domain(categories) 
            .range([0, height])
            .padding(0.1); 

        // Creación de Ejes
        // Eje X
        svg.append("g")
            .attr("class", "x-axis") 
            .attr("transform", `translate(0,${height})`)
            .call(d3.axisBottom(xScale))
            .append("text")
            .attr("x", width)
            .attr("y", -6)
            .attr("fill", "#000")
            .attr("text-anchor", "end")
            .text("Número de Pacientes"); 

        // Eje Y
        svg.append("g")
            .attr("class", "y-axis") 
            .call(d3.axisLeft(yScale))
            .append("text")
            .attr("x", -margin.left + 10)
            .attr("y", -6)
            .attr("fill", "#000")
            .attr("text-anchor", "start")
            .text("Causa de Mortalidad"); 

        // Creación de Barras
        const bars = svg.selectAll(".bar")
            .data(data)
            .enter()
            .append("rect")
            .attr("class", "bar")
            .attr("y", d => {
                const yPos = yScale(d.mortalidad);
                if (yPos === undefined) {
                    console.error(`Causa "${d.mortalidad}" no encontrada en el dominio de yScale.`);
                }
                return yPos;
            })
            .attr("height", yScale.bandwidth())
            .attr("x", 0)
            .attr("width", d => {
                const barWidth = xScale(+d.numero_pacientes);
                if (isNaN(barWidth) || barWidth < 0) {
                    console.error(`Ancho de barra inválido para ${d.mortalidad}: ${d.numero_pacientes} -> ${barWidth}`);
                }
                return barWidth;
            });

        // Interactividad: Tooltips
        // Asegúrate de que el tooltip se cree solo una vez al cargar la página
        let tooltip = d3.select("body").select(".tooltip");
        if (tooltip.empty()) {
            tooltip = d3.select("body").append("div")
                .attr("class", "tooltip")
                .style("opacity", 0);
        }

        bars.on("mouseover", function(event, d) {
            tooltip.transition()
                .duration(200)
                .style("opacity", .9);
            tooltip.html(`Causa: <strong>${d.mortalidad}</strong><br/>Pacientes: <strong>${d.numero_pacientes}</strong>`)
                .style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 28) + "px");

            d3.select(this).style("fill", "orange");
        })
        .on("mouseout", function(d) {
            tooltip.transition()
                .duration(500)
                .style("opacity", 0);
            d3.select(this).style("fill", "steelblue");
        });
    }

    // Cargar los datos del CSV
    d3.csv(csvFilePath).then(function(data) {
        console.log("Datos CSV cargados RAW:", data); 
        
        if (data.length === 0) {
            console.warn("El archivo CSV está vacío o no se cargaron datos.");
            loadingMessage.text("No se encontraron datos en el archivo CSV.");
            loadingMessage.style("color", "orange");
            return;
        }

        // Asegúrate de que los datos numéricos se parseen correctamente y filtra datos inválidos
        const cleanData = data.filter(d => {
            const numPacientes = +d.numero_pacientes;
            const isValid = !isNaN(numPacientes) && d.mortalidad !== undefined && d.mortalidad !== "";
            if (!isValid) {
                console.warn("Fila descartada debido a datos inválidos:", d);
            }
            d.numero_pacientes = numPacientes; // Asigna el valor numérico parseado de vuelta al objeto
            return isValid;
        });

        if (cleanData.length === 0) {
            console.warn("No hay datos válidos para mostrar después de la limpieza.");
            loadingMessage.text("No hay datos válidos para visualizar después de procesar el CSV.");
            loadingMessage.style("color", "orange");
            return;
        }

        // Opcional: Si quieres ordenar los datos (ej. de mayor a menor número de pacientes)
        cleanData.sort((a, b) => b.numero_pacientes - a.numero_pacientes);
        console.log("Datos limpios y procesados para visualización:", cleanData);

        drawChart(cleanData); // Dibuja el gráfico con los datos cargados y limpios
    }).catch(function(error) {
        console.error("Error al cargar o procesar el archivo CSV:", error);
        loadingMessage.text("Error al cargar los datos. Por favor, verifica la consola para más detalles.");
        loadingMessage.style("color", "red");
    });

    // Responsividad
    window.addEventListener('resize', function() {
        d3.csv(csvFilePath).then(function(data) {
            const cleanData = data.filter(d => {
                const numPacientes = +d.numero_pacientes;
                return !isNaN(numPacientes) && d.mortalidad !== undefined && d.mortalidad !== "";
            });
            cleanData.forEach(d => d.numero_pacientes = +d.numero_pacientes); // Asegurarse de parsear de nuevo
            cleanData.sort((a, b) => b.numero_pacientes - a.numero_pacientes);
            drawChart(cleanData);
        }).catch(function(error) {
            console.error("Error al recargar el archivo CSV para responsividad:", error);
        });
    });
});
